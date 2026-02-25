import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Country-specific Place IDs
const PLACE_IDS: Record<string, string> = {
  qa: 'ChIJPciGedDPRT4RetH05W0NOvY',
  kw: 'ChIJud10oHuQzz8RMLZClbrsXVc',
};

const BLACKLISTED_AUTHORS = [
  'abenialatasweswe oluwatobi',
  'ziad marogy',
];

interface SerperReview {
  rating?: number;
  date?: string;
  snippet?: string;
  likes?: number;
  user?: {
    name?: string;
    thumbnail?: string;
    reviews?: number;
  };
  media?: Array<{
    type?: string;
    imageUrl?: string;
  }>;
}

async function fetchSerperPage(apiKey: string, placeId: string, gl: string, hl: string, page: number, nextPageToken?: string): Promise<{ reviews: SerperReview[]; nextToken?: string }> {
  const body: Record<string, unknown> = {
    placeId,
    gl,
    hl,
    sortBy: 'mostRelevant',
    num: 20,
  };

  if (nextPageToken) {
    body.nextPageToken = nextPageToken;
  } else {
    body.page = page;
  }

  const response = await fetch('https://google.serper.dev/reviews', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error(`Serper error hl=${hl} page=${page}:`, response.status);
    return { reviews: [] };
  }

  const data = await response.json();
  console.log(`Fetched ${data.reviews?.length || 0} reviews (hl=${hl}, page=${page})`);
  return { reviews: data.reviews || [], nextToken: data.nextPageToken };
}

async function fetchAllReviews(apiKey: string, placeId: string, gl: string, hl: string): Promise<SerperReview[]> {
  const all: SerperReview[] = [];

  const p1 = await fetchSerperPage(apiKey, placeId, gl, hl, 1);
  all.push(...p1.reviews);

  if (p1.nextToken) {
    const p2 = await fetchSerperPage(apiKey, placeId, gl, hl, 2, p1.nextToken);
    all.push(...p2.reviews);
    if (p2.nextToken) {
      const p3 = await fetchSerperPage(apiKey, placeId, gl, hl, 3, p2.nextToken);
      all.push(...p3.reviews);
    }
  }

  if (p1.reviews.length === 0) {
    for (let pg = 2; pg <= 5; pg++) {
      const result = await fetchSerperPage(apiKey, placeId, gl, hl, pg);
      if (result.reviews.length === 0) break;
      all.push(...result.reviews);
      if (result.nextToken) {
        const next = await fetchSerperPage(apiKey, placeId, gl, hl, pg + 1, result.nextToken);
        all.push(...next.reviews);
        break;
      }
    }
  }

  return all;
}

async function translateToArabic(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return '';

  try {
    const truncated = text.substring(0, 4500);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=en|ar`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Translation API error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated === text) return '';
      return translated;
    }
    return '';
  } catch (err) {
    console.warn('Translation error:', err);
    return '';
  }
}

function translateDateToArabic(date: string): string {
  if (!date) return '';
  return date
    .replace(/today/i, 'اليوم')
    .replace(/yesterday/i, 'أمس')
    .replace(/a day ago/i, 'منذ يوم')
    .replace(/(\d+)\s*days?\s*ago/i, (_, n) => `منذ ${n} أيام`)
    .replace(/a week ago/i, 'منذ أسبوع')
    .replace(/(\d+)\s*weeks?\s*ago/i, (_, n) => `منذ ${n} أسابيع`)
    .replace(/a month ago/i, 'منذ شهر')
    .replace(/(\d+)\s*months?\s*ago/i, (_, n) => `منذ ${n} أشهر`)
    .replace(/a year ago/i, 'منذ سنة')
    .replace(/(\d+)\s*years?\s*ago/i, (_, n) => `منذ ${n} سنوات`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serperApiKey = Deno.env.get('SERPER_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!serperApiKey) throw new Error('SERPER_API_KEY not configured');

    // Accept country_id from request body (default 'qa')
    let countryId = 'qa';
    try {
      const body = await req.json();
      if (body.country_id && PLACE_IDS[body.country_id]) {
        countryId = body.country_id;
      }
    } catch { /* no body or invalid JSON, use default */ }

    const placeId = PLACE_IDS[countryId];
    const gl = countryId; // geo-location matches country
    console.log(`Fetching reviews for country=${countryId}, placeId=${placeId}`);

    const allEnglish = await fetchAllReviews(serperApiKey, placeId, gl, 'en');
    console.log(`English reviews fetched: ${allEnglish.length}`);

    // Deduplicate by author name
    const seen = new Set<string>();
    const uniqueEnglish: SerperReview[] = [];
    for (const en of allEnglish) {
      const authorName = (en.user?.name || '').toLowerCase().trim();
      if (BLACKLISTED_AUTHORS.some(b => authorName.includes(b))) continue;
      if (seen.has(authorName)) continue;
      seen.add(authorName);
      uniqueEnglish.push(en);
    }

    console.log(`Unique after dedup: ${uniqueEnglish.length}`);

    // Translate each review to Arabic
    const rows = [];
    for (let i = 0; i < uniqueEnglish.length; i++) {
      const en = uniqueEnglish[i];
      const authorName = en.user?.name || 'Anonymous';
      const enText = en.snippet || '';

      console.log(`Translating review ${i + 1}/${uniqueEnglish.length} by ${authorName}...`);
      const arText = await translateToArabic(enText);
      const arDate = translateDateToArabic(en.date || '');

      if (i < uniqueEnglish.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      rows.push({
        author_name: authorName,
        author_image: en.user?.thumbnail || null,
        rating: en.rating || 5,
        review_text_en: enText,
        review_text_ar: arText,
        review_date: en.date || '',
        review_date_ar: arDate,
        review_images: (en.media || [])
          .filter(m => m.type === 'image' && m.imageUrl)
          .map(m => m.imageUrl),
        helpful_votes: en.likes || 0,
        sort_order: i,
        is_active: true,
        country_id: countryId,
      });
    }

    // Delete only reviews for this country, then insert
    await supabase.from('qatar_reviews').delete().eq('country_id', countryId);

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from('qatar_reviews')
        .insert(rows);
      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    }

    const withArabic = rows.filter(r => r.review_text_ar && r.review_text_ar.length > 0).length;
    console.log(`✅ Stored ${rows.length} reviews for ${countryId} (${withArabic} with Arabic translation)`);

    return new Response(
      JSON.stringify({
        success: true,
        country_id: countryId,
        stored: rows.length,
        with_arabic: withArabic,
        english_fetched: allEnglish.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
