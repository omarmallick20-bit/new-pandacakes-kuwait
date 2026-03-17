import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, Search, Crosshair, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { COUNTRY_ID, COUNTRY_NAME, DEFAULT_CURRENCY } from '@/config/country';
import { Skeleton } from '@/components/ui/skeleton';
import { withTimeoutAutoAbort } from '@/utils/withTimeoutAbort';

const MAP_TIMEOUT_MS = 8000;

interface LocationData {
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  street: string;
  displayName: string;
}

interface DeliveryZoneData {
  zone_id: string | null;
  zone_name: string;
  delivery_fee: number | null;
  delivery_time_minutes: number | null;
  min_order_value: number | null;
  is_serviceable: boolean;
}

interface DeliveryZoneMapProps {
  onLocationSelect: (locationData: LocationData & DeliveryZoneData) => void;
  showZoneBoundaries?: boolean;
  initialPosition?: { lat: number; lng: number };
  className?: string;
}

export const DeliveryZoneMap: React.FC<DeliveryZoneMapProps> = ({
  onLocationSelect,
  showZoneBoundaries = false,
  initialPosition,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const mountedRef = useRef(true);

  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZoneData | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isDetectingZone, setIsDetectingZone] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);

  // Default to Kuwait City, Kuwait
  const defaultPosition: [number, number] = [
    initialPosition?.lng || 47.9783,
    initialPosition?.lat || 29.3759,
  ];

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch Mapbox token from site_config with timeout
  useEffect(() => {
    const fetchMapboxToken = async () => {
      const { data: result, timedOut, error } = await withTimeoutAutoAbort(
        async (signal) => {
          const { data, error } = await supabase
            .from('site_config')
            .select('mapbox_token')
            .eq('is_active', true)
            .eq('country_code', COUNTRY_ID)
            .abortSignal(signal)
            .single();
          
          if (error) throw error;
          return data;
        },
        { timeoutMs: MAP_TIMEOUT_MS, operationName: 'fetchMapboxToken' }
      );

      if (!mountedRef.current) return;

      if (timedOut) {
        console.warn('⏱️ Mapbox token fetch timed out');
        toast({
          title: 'Map Loading Slow',
          description: 'Map is taking longer than expected. Please refresh if it doesn\'t load.',
          variant: 'destructive',
        });
        setIsLoadingToken(false);
        return;
      }

      if (error) {
        console.error('Error fetching Mapbox token:', error);
        setIsLoadingToken(false);
        return;
      }
        
      if (result?.mapbox_token) {
        setMapboxToken(result.mapbox_token);
      } else {
        console.warn('No Mapbox token found in site_config');
        toast({
          title: 'Map Configuration Missing',
          description: 'Please configure your Mapbox token in site settings',
          variant: 'destructive',
        });
      }
      setIsLoadingToken(false);
    };

    fetchMapboxToken();
  }, []);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainerRef.current || map.current || !mapboxToken) return;

    const initializeMap = async () => {
      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: defaultPosition,
        zoom: 12,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2DD4BF" class="w-8 h-8">
        <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
      </svg>`;
      markerEl.style.cursor = 'pointer';

      // Add draggable marker
      marker.current = new mapboxgl.Marker({
        element: markerEl,
        draggable: true,
      })
        .setLngLat(defaultPosition)
        .addTo(map.current);

      // Handle marker drag end
      marker.current.on('dragend', async () => {
        const lngLat = marker.current!.getLngLat();
        await reverseGeocode(lngLat.lat, lngLat.lng);
      });

      // Handle map click
      map.current.on('click', async (e) => {
        marker.current?.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        await reverseGeocode(e.lngLat.lat, e.lngLat.lng);
      });

      // Load delivery zones when map is ready
      map.current.on('load', async () => {
        if (showZoneBoundaries) {
          await loadDeliveryZones();
        }
        // Initial geocode
        await reverseGeocode(
          initialPosition?.lat || 29.3759,
          initialPosition?.lng || 47.9783
        );
      });
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // Load delivery zones as GeoJSON
  const loadDeliveryZones = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-delivery-zones-geojson', {
        body: { country_id: COUNTRY_ID }
      });

      if (error) throw error;

      if (data && map.current) {
        // Add the source
        if (!map.current.getSource('delivery-zones')) {
          map.current.addSource('delivery-zones', {
            type: 'geojson',
            data: data
          });

          // Add fill layer (invisible - only for zone detection)
          map.current.addLayer({
            id: 'delivery-zones-fill',
            type: 'fill',
            source: 'delivery-zones',
            paint: {
              'fill-color': '#10B981',
              'fill-opacity': 0
            }
          });

          // Add outline layer (invisible)
          map.current.addLayer({
            id: 'delivery-zones-outline',
            type: 'line',
            source: 'delivery-zones',
            paint: {
              'line-color': '#059669',
              'line-width': 0,
              'line-opacity': 0
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading delivery zones:', error);
    }
  };

  // Reverse geocode coordinates to address using Mapbox with timeout
  const reverseGeocode = async (lat: number, lng: number) => {
    if (!mapboxToken || !mountedRef.current) return;
    
    setIsGeocoding(true);
    setIsDetectingZone(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAP_TIMEOUT_MS);

    try {
      // Get address from Mapbox Geocoding API with abort signal
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=en&types=address,place,locality,neighborhood`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      const data = await response.json();
      const feature = data.features?.[0];

      let city = '';
      let street = '';
      let country = 'Kuwait';

      if (feature) {
        // Extract context info
        feature.context?.forEach((ctx: any) => {
          if (ctx.id.startsWith('place') || ctx.id.startsWith('locality')) {
            city = ctx.text;
          }
          if (ctx.id.startsWith('country')) {
            country = ctx.text;
          }
        });

        // Get street from the main feature or neighborhood
        street = feature.text || '';
        if (feature.properties?.address) {
          street = feature.properties.address;
        }
      }

      const locationData: LocationData = {
        latitude: lat,
        longitude: lng,
        country: country,
        city: city || 'Kuwait City',
        street: street,
        displayName: feature?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };

      if (!mountedRef.current) return;
      setCurrentLocation(locationData);

      // Detect delivery zone with timeout
      const zoneController = new AbortController();
      const zoneTimeoutId = setTimeout(() => zoneController.abort(), MAP_TIMEOUT_MS);

      const { data: zoneData, error: zoneError } = await supabase.functions.invoke('detect-delivery-zone', {
        body: { latitude: lat, longitude: lng, country_id: COUNTRY_ID }
      });

      clearTimeout(zoneTimeoutId);

      if (!mountedRef.current) return;

      if (zoneError) {
        console.error('Zone detection error:', zoneError);
        throw zoneError;
      }

      const deliveryZoneData: DeliveryZoneData = zoneData;
      setDeliveryZone(deliveryZoneData);

      // Callback with combined data
      onLocationSelect({
        ...locationData,
        ...deliveryZoneData,
      });

    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('⏱️ Geocoding timed out');
        if (mountedRef.current) {
          toast({
            title: 'Location Detection Slow',
            description: 'Please try again or search manually.',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Error in reverse geocoding or zone detection:', error);
        if (mountedRef.current) {
          toast({
            title: 'Error',
            description: 'Failed to detect location or delivery zone',
            variant: 'destructive',
          });
        }
      }
    } finally {
      clearTimeout(timeoutId);
      if (mountedRef.current) {
        setIsGeocoding(false);
        setIsDetectingZone(false);
      }
    }
  };

  // Search locations using Mapbox Geocoding API with timeout
  const searchLocation = async (query: string) => {
    if (query.length < 3 || !mapboxToken || !mountedRef.current) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 [DeliveryZoneMap] Searching:', query);
    setIsSearching(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MAP_TIMEOUT_MS);

    try {
const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=${COUNTRY_ID}&language=en&limit=5`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      if (!mountedRef.current) return;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DeliveryZoneMap] Mapbox search error:', response.status, errorText);
        toast({
          title: 'Search failed',
          description: 'Unable to search locations. Please try again.',
          variant: 'destructive',
        });
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      console.log('✅ [DeliveryZoneMap] Search results:', data.features?.length || 0);
      if (mountedRef.current) {
        setSearchResults(data.features || []);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        console.warn('⏱️ Search timed out');
      } else {
        console.error('❌ [DeliveryZoneMap] Search error:', error);
        if (mountedRef.current) {
          toast({
            title: 'Search failed',
            description: 'Failed to search location. Check your connection.',
            variant: 'destructive',
          });
        }
      }
      if (mountedRef.current) {
        setSearchResults([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsSearching(false);
      }
    }
  };

  // Debounced search
  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    const timeoutId = setTimeout(() => searchLocation(value), 500);
    return () => clearTimeout(timeoutId);
  };

  // Handle search result selection
  const handleSelectLocation = (result: any) => {
    const [lng, lat] = result.center;

    if (marker.current && map.current) {
      marker.current.setLngLat([lng, lat]);
      map.current.flyTo({ center: [lng, lat], zoom: 16 });
      reverseGeocode(lat, lng);
    }

    setSearchQuery(result.place_name);
    setSearchResults([]);
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not Supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive',
      });
      return;
    }

    console.log('📍 [DeliveryZoneMap] Requesting geolocation...');
    setIsGeocoding(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ [DeliveryZoneMap] Got location:', position.coords.latitude, position.coords.longitude);
        const { latitude, longitude } = position.coords;
        if (marker.current && map.current) {
          marker.current.setLngLat([longitude, latitude]);
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          reverseGeocode(latitude, longitude);
        }
      },
      (error) => {
        console.error('❌ [DeliveryZoneMap] Geolocation error:', error.code, error.message);
        setIsGeocoding(false);
        
        // Provide specific error messages based on error code
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast({
              title: 'Location Access Denied',
              description: 'Please enable location permissions in your browser settings and try again.',
              variant: 'destructive',
            });
            break;
          case error.POSITION_UNAVAILABLE:
            toast({
              title: 'Location Unavailable',
              description: 'Your location information is unavailable. Please try again or search manually.',
              variant: 'destructive',
            });
            break;
          case error.TIMEOUT:
            toast({
              title: 'Request Timed Out',
              description: 'Location request took too long. Please try again.',
              variant: 'destructive',
            });
            break;
          default:
            toast({
              title: 'Location Error',
              description: 'Unable to retrieve your location. Please search manually.',
              variant: 'destructive',
            });
        }
      },
      options
    );
  };

  if (isLoadingToken) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-[200px] sm:h-[280px] md:h-[350px] w-full rounded-lg" />
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center h-[200px] sm:h-[280px] md:h-[350px] bg-muted rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Map configuration required</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Box */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={`Search for a location in ${COUNTRY_NAME}...`}
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-4 py-2 hover:bg-accent text-sm"
              >
                <div className="font-medium">{result.text}</div>
                <div className="text-xs text-muted-foreground">{result.place_name}</div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {searchResults.length === 0 && searchQuery.length >= 3 && !isSearching && (
          <div className="absolute z-[9999] w-full mt-1 bg-popover border rounded-md shadow-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              No locations found. Try a different search term.
            </p>
          </div>
        )}
      </div>

      {/* Use Current Location Button */}
      <div className="space-y-1.5">
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isGeocoding}
          className="w-full border-2 border-tiffany text-tiffany-active hover:bg-tiffany/10 font-semibold animate-pulse-subtle"
        >
          <Crosshair className="mr-2 h-4 w-4" />
          Use My Current Location
        </Button>
        <p className="text-xs text-center text-tiffany-active/70">
          📍 Recommended for accurate delivery
        </p>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="h-[200px] sm:h-[280px] md:h-[350px] w-full rounded-lg border" />

      {/* Selected Location Display */}
      {currentLocation && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium">Selected Location</p>
              <p className="text-xs text-muted-foreground mt-1">
                {currentLocation.displayName}
              </p>
            </div>
            {isGeocoding && <Loader2 className="h-4 w-4 animate-spin mt-1" />}
          </div>

          {/* Delivery Zone Info */}
          {isDetectingZone ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Detecting delivery zone...</span>
            </div>
          ) : deliveryZone ? (
            deliveryZone.is_serviceable ? (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">✓ Delivery Available</span>
                </div>
                <p className="text-sm font-semibold">
                  Delivery Fee: {deliveryZone.delivery_fee} {DEFAULT_CURRENCY}
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimated Time: {deliveryZone.delivery_time_minutes} minutes
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-destructive pt-2 border-t">
                <XCircle className="h-5 w-5 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">No delivery to this location</p>
                  <p className="text-xs mt-1">
                    Please pick a different location within our delivery zones
                  </p>
                </div>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
};
