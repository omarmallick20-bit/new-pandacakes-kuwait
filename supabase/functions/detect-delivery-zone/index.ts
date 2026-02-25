import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Point-in-polygon algorithm using ray casting
function pointInPolygon(point: [number, number], polygon: number[][][]): boolean {
  const [lng, lat] = point;
  let inside = false;
  
  for (const ring of polygon) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      
      const intersect = ((yi > lat) !== (yj > lat)) && 
                       (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  }
  
  return inside;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Detecting delivery zone for coordinates: ${latitude}, ${longitude}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active delivery zones
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .eq('country_id', 'qa');

    if (error) {
      console.error('Error fetching zones:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch delivery zones' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which zone contains the point
    for (const zone of zones || []) {
      try {
        const geometry = zone.geometry;
        if (geometry.type === 'Polygon') {
          const coordinates = geometry.coordinates as number[][][];
          if (pointInPolygon([longitude, latitude], coordinates)) {
            console.log(`Point found in zone: ${zone.zone_name}`);
            
            // Check if zone is non-serviceable (is_active = false)
            if (zone.is_active === false) {
              return new Response(
                JSON.stringify({
                  zone_id: zone.id,
                  zone_name: zone.zone_name,
                  delivery_fee: null,
                  delivery_time_minutes: null,
                  is_serviceable: false
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            // Serviceable zone found
            return new Response(
              JSON.stringify({
                zone_id: zone.id,
                zone_name: zone.zone_name,
                delivery_fee: zone.delivery_fee,
                delivery_time_minutes: zone.delivery_time_minutes,
                min_order_value: zone.min_order_value || 0,
                is_serviceable: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (err) {
        console.error(`Error checking zone ${zone.zone_name}:`, err);
      }
    }

    // No specific zone found - check if in Qatar bounds (fallback)
    const isInQatarBounds = (
      latitude >= 24.4 && latitude <= 26.3 && // Qatar latitude range
      longitude >= 50.5 && longitude <= 51.7   // Qatar longitude range
    );

    if (isInQatarBounds) {
      console.log('Point in Qatar but outside defined delivery zones - NOT serviceable');
      return new Response(
        JSON.stringify({
          zone_id: null,
          zone_name: 'Outside delivery zones',
          delivery_fee: null,
          delivery_time_minutes: null,
          is_serviceable: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No zone found - location is outside Qatar
    console.log('Point is outside Qatar delivery area');
    return new Response(
      JSON.stringify({
        zone_id: null,
        zone_name: 'Outside delivery area',
        delivery_fee: null,
        delivery_time_minutes: null,
        is_serviceable: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-delivery-zone function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
