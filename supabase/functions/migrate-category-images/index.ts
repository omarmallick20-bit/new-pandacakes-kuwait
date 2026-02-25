import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Category {
  id: string;
  name: string;
  image_url: string;
  image_migrated: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    console.log('🚀 Starting category image migration...');

    // Fetch all categories that haven't been migrated yet
    const { data: categories, error: fetchError } = await supabaseClient
      .from('categories')
      .select('id, name, image_url, image_migrated')
      .eq('image_migrated', false);

    if (fetchError) {
      console.error('❌ Error fetching categories:', fetchError);
      throw fetchError;
    }

    if (!categories || categories.length === 0) {
      console.log('✅ All categories already migrated or no categories found');
      return new Response(
        JSON.stringify({ success: true, message: 'All categories already migrated', migrated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${categories.length} categories to migrate`);

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];

    for (const category of categories) {
      try {
        // Check if image_url is already a storage URL
        if (category.image_url.startsWith('http://') || category.image_url.startsWith('https://')) {
          console.log(`⏭️  Skipping ${category.name} - already a URL`);
          
          // Mark as migrated
          await supabaseClient
            .from('categories')
            .update({ image_migrated: true })
            .eq('id', category.id);
          
          successCount++;
          continue;
        }

        // Check if it's base64 data
        if (!category.image_url.startsWith('data:image/')) {
          console.log(`⚠️  Skipping ${category.name} - not base64 data`);
          continue;
        }

        console.log(`🔄 Processing ${category.name}...`);

        // Extract base64 data and mime type
        const matches = category.image_url.match(/^data:image\/(\w+);base64,(.*)$/);
        if (!matches) {
          throw new Error('Invalid base64 format');
        }

        const mimeType = matches[1]; // e.g., 'jpeg', 'png', 'jpg'
        const base64Data = matches[2];

        // Decode base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Generate filename
        const fileName = `${category.id}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`;
        const filePath = `categories/${fileName}`;

        console.log(`📤 Uploading ${fileName} (${(bytes.length / 1024).toFixed(2)} KB)...`);

        // Upload to storage
        const { error: uploadError } = await supabaseClient.storage
          .from('category-images')
          .upload(filePath, bytes, {
            contentType: `image/${mimeType}`,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabaseClient.storage
          .from('category-images')
          .getPublicUrl(filePath);

        console.log(`✅ Uploaded ${fileName} successfully`);

        // Update category with new URL
        const { error: updateError } = await supabaseClient
          .from('categories')
          .update({
            image_url: urlData.publicUrl,
            image_migrated: true,
          })
          .eq('id', category.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✅ Updated ${category.name} with storage URL`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${category.name}:`, error);
        errorCount++;
        errors.push({
          id: category.id,
          name: category.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`\n📊 Migration complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed',
        migrated: successCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Fatal error during migration:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
