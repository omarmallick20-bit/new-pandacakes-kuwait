import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.97.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rows, error } = await supabase
      .from('categories')
      .select('id, name, image_url')
      .like('image_url', 'data:%');
    if (error) throw error;

    const results: any[] = [];
    for (const row of rows ?? []) {
      const m = (row.image_url as string).match(/^data:([^;]+);base64,(.+)$/);
      if (!m) { results.push({ id: row.id, name: row.name, status: 'skip-no-match' }); continue; }
      const mime = m[1];
      const b64 = m[2];
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const path = `migrated/${row.id}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('category-images')
        .upload(path, bytes, { contentType: mime, upsert: true });
      if (upErr) { results.push({ id: row.id, name: row.name, status: 'upload-failed', err: upErr.message }); continue; }

      const { data: pub } = supabase.storage.from('category-images').getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('categories')
        .update({ image_url: publicUrl, image_migrated: true })
        .eq('id', row.id);
      if (updErr) { results.push({ id: row.id, name: row.name, status: 'update-failed', err: updErr.message }); continue; }

      results.push({ id: row.id, name: row.name, status: 'ok', size_kb: Math.round(bytes.length / 1024), url: publicUrl });
    }

    return new Response(JSON.stringify({ migrated: results.length, results }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});