import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const countryId = url.searchParams.get('country_id') || 'qa';

    console.log(`Fetching delivery zones for country: ${countryId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all active delivery zones
    const { data: zones, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .eq('is_active', true)
      .eq('country_id', countryId);

    if (error) {
      console.error('Error fetching zones:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch delivery zones' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to GeoJSON FeatureCollection
    const geoJson = {
      type: 'FeatureCollection',
      features: (zones || []).map(zone => ({
        type: 'Feature',
        properties: {
          id: zone.id,
          zone_name: zone.zone_name,
          delivery_fee: zone.delivery_fee,
          delivery_time_minutes: zone.delivery_time_minutes,
          is_active: zone.is_active,
          country_id: zone.country_id
        },
        geometry: zone.geometry
      }))
    };

    console.log(`Returning ${geoJson.features.length} delivery zones`);

    return new Response(
      JSON.stringify(geoJson),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-delivery-zones-geojson function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
