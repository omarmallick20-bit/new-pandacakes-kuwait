import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Loader2, Search, Crosshair } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { COUNTRY_ID } from '@/config/country';

interface LocationData {
  latitude: number;
  longitude: number;
  street_address?: string;
  city?: string;
  formatted_address?: string;
}

interface AddressMapPickerProps {
  onLocationSelect: (locationData: LocationData) => void;
  initialPosition?: { lat: number; lng: number };
  className?: string;
}

export default function AddressMapPicker({ 
  onLocationSelect, 
  initialPosition,
  className = '' 
}: AddressMapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  const [isMapReady, setIsMapReady] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Default to Kuwait City, Kuwait [lng, lat] for Mapbox
  const defaultCenter: [number, number] = [47.9783, 29.3759];

  // Fetch Mapbox token from site_config
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase
          .from('site_config')
          .select('mapbox_token')
          .eq('is_active', true)
          .eq('country_code', COUNTRY_ID)
          .single();

        if (error) throw error;
        
        if (data?.mapbox_token) {
          setMapboxToken(data.mapbox_token);
        } else {
          console.warn('No Mapbox token found in site_config');
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  const initializeMap = () => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;

      const initialCenter = initialPosition 
        ? [initialPosition.lng, initialPosition.lat] as [number, number]
        : defaultCenter;

      // Create map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: 14,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Create custom marker element
      const markerEl = document.createElement('div');
      markerEl.innerHTML = `<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#2DD4BF"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>`;
      markerEl.style.cursor = 'pointer';

      // Create draggable marker
      marker.current = new mapboxgl.Marker({
        element: markerEl,
        draggable: true,
      })
        .setLngLat(initialCenter)
        .addTo(map.current);

      // Handle marker drag end
      marker.current.on('dragend', () => {
        if (!marker.current) return;
        const lngLat = marker.current.getLngLat();
        reverseGeocode(lngLat.lat, lngLat.lng);
      });

      // Handle map click to move marker
      map.current.on('click', (e) => {
        if (marker.current) {
          marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
          reverseGeocode(e.lngLat.lat, e.lngLat.lng);
        }
      });

      // When map is ready
      map.current.on('load', () => {
        // Initial reverse geocode
        reverseGeocode(
          initialPosition?.lat || 29.3759,
          initialPosition?.lng || 47.9783
        );
        setIsMapReady(true);
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    if (!mapboxToken) return;
    
    setIsGeocoding(true);
    try {
      // Use Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=en&types=address,place,locality,neighborhood`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      const feature = data.features?.[0];

      let street = '';
      let city = 'Kuwait City';

      if (feature) {
        // Extract street from feature
        street = feature.text || '';
        if (feature.properties?.address) {
          street = feature.properties.address;
        }

        // Extract city from context
        feature.context?.forEach((ctx: any) => {
          if (ctx.id.startsWith('place') || ctx.id.startsWith('locality')) {
            city = ctx.text;
          }
        });
      }

      const locationData: LocationData = {
        latitude: lat,
        longitude: lng,
        street_address: street,
        city: city,
        formatted_address: feature?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      };

      setCurrentLocation(locationData);
      onLocationSelect(locationData);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast.error('Failed to fetch address details');
    } finally {
      setIsGeocoding(false);
    }
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3 || !mapboxToken) {
      setSearchResults([]);
      return;
    }
    
    console.log('🔍 [AddressMapPicker] Searching:', query);
    setIsSearching(true);
    try {
      // Search with Mapbox Geocoding API
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&country=kw&language=en&limit=5`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [AddressMapPicker] Mapbox search error:', response.status, errorText);
        toast.error('Search failed. Please try again.');
        setSearchResults([]);
        return;
      }

      const data = await response.json();
      console.log('✅ [AddressMapPicker] Search results:', data.features?.length || 0);
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('❌ [AddressMapPicker] Search error:', error);
      toast.error('Failed to search location. Check your connection.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    
    // Debounce search to avoid too many API calls
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(value);
    }, 500);
  };

  const handleSelectLocation = (result: any) => {
    const [lng, lat] = result.center;
    
    // Move marker to selected location
    if (marker.current && map.current) {
      marker.current.setLngLat([lng, lat]);
      map.current.flyTo({ center: [lng, lat], zoom: 16 });
      reverseGeocode(lat, lng);
    }
    
    setSearchQuery(result.place_name);
    setSearchResults([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    console.log('📍 [AddressMapPicker] Requesting geolocation...');
    setIsGeocoding(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ [AddressMapPicker] Got location:', position.coords.latitude, position.coords.longitude);
        const { latitude, longitude } = position.coords;
        if (marker.current && map.current) {
          marker.current.setLngLat([longitude, latitude]);
          map.current.flyTo({ center: [longitude, latitude], zoom: 16 });
          reverseGeocode(latitude, longitude);
        }
      },
      (error) => {
        console.error('❌ [AddressMapPicker] Geolocation error:', error.code, error.message);
        setIsGeocoding(false);
        
        // Provide specific error messages based on error code
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions in your browser settings and try again.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Your location is unavailable. Please try again or search manually.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out. Please try again.');
            break;
          default:
            toast.error('Unable to retrieve your location. Please search manually.');
        }
      },
      options
    );
  };

  useEffect(() => {
    if (mapboxToken) {
      initializeMap();
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [mapboxToken]);

  if (isLoadingToken) {
    return (
      <div className={`flex items-center justify-center h-[400px] ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mapboxToken) {
    return (
      <div className={`flex items-center justify-center h-[400px] bg-muted rounded-lg ${className}`}>
        <p className="text-sm text-muted-foreground">Map configuration required</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Box */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a location in Kuwait..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleUseCurrentLocation}
            disabled={isGeocoding}
            title="Use my current location"
          >
            <Crosshair className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="relative z-50 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <div className="font-medium text-sm">
                  {result.text}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.place_name}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {searchResults.length === 0 && searchQuery.length >= 3 && !isSearching && (
          <div className="relative z-50 w-full bg-popover border rounded-md shadow-lg p-4">
            <p className="text-sm text-muted-foreground text-center">
              No locations found. Try a different search term.
            </p>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="w-full h-[400px] rounded-lg border border-border shadow-sm relative"
      >
        {isGeocoding && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000] rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching address...</span>
            </div>
          </div>
        )}
      </div>

      {currentLocation && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-tiffany flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Selected Location:</p>
              <p className="text-muted-foreground">{currentLocation.formatted_address}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Coordinates: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" />
        <span>Drag the marker or click on the map to adjust your location</span>
      </div>
    </div>
  );
}
