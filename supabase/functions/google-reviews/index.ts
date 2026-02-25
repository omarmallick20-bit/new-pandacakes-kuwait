import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SerperReview {
  rating?: number;
  date?: string;
  snippet?: string;
  likes?: number;
  user?: {
    name?: string;
    thumbnail?: string;
    link?: string;
    reviews?: number;
    photos?: number;
  };
  media?: Array<{
    type?: string;
    imageUrl?: string;
  }>;
}

interface CachedData {
  review_data: any[];
  stats_data: any;
  place_info: any;
  expires_at: string;
  cached_at?: string;
}

const BLACKLISTED_AUTHORS = [
  'abenialatasweswe oluwatobi',
  'ziad marogy',
];

const CACHE_DURATION_HOURS = 168;
const STALE_GRACE_HOURS = 1;

const PANDA_CAKES_PLACE_ID = 'ChIJPciGedDPRT4RetH05W0NOvY';
const PANDA_CAKES_INFO = {
  name: 'Panda Cakes',
  address: 'Barwa Village, Doha, Qatar',
  rating: 4.8,
  reviewsCount: 500,
  placeId: PANDA_CAKES_PLACE_ID
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const serperApiKey = Deno.env.get('SERPER_API_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getCachedReviews(placeId: string, lang: string): Promise<{ data: CachedData | null; isStale: boolean }> {
  try {
    const pageToken = lang === 'ar' ? 'ar' : '';
    const { data, error } = await supabase
      .from('google_reviews_cache')
      .select('review_data, stats_data, place_info, expires_at, cached_at')
      .eq('place_id', placeId)
      .eq('page_token', pageToken)
      .single();

    if (error || !data) {
      console.log(`Cache miss for lang=${lang}`);
      return { data: null, isStale: false };
    }

    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const cachedAt = data.cached_at ? new Date(data.cached_at) : new Date(0);
    
    if (expiresAt < now) {
      return { data: null, isStale: false };
    }
    
    const staleThreshold = new Date(cachedAt.getTime() + STALE_GRACE_HOURS * 60 * 60 * 1000);
    const isStale = now > staleThreshold;
    
    return { data: data as CachedData, isStale };
  } catch (err) {
    console.error('Cache lookup error:', err);
    return { data: null, isStale: false };
  }
}

async function backgroundRefresh(placeId: string, lang: string): Promise<void> {
  console.log(`Background refresh starting (lang=${lang})...`);
  try {
    const reviewsResult = await fetchReviewsFromSerper(1, lang);
    if (!reviewsResult) return;

    const reviews = processReviews(reviewsResult.reviews);
    const ratingDistribution = estimateRatingDistribution(reviewsResult.stats.rating, reviewsResult.stats.totalReviews);
    
    const stats = {
      averageRating: reviewsResult.stats.rating,
      totalReviews: reviewsResult.stats.totalReviews,
      ratingDistribution,
    };

    await cacheReviews(placeId, reviews, stats, PANDA_CAKES_INFO, lang);
  } catch (err) {
    console.error('Background refresh error:', err);
  }
}

async function cacheReviews(placeId: string, reviews: any[], stats: any, placeInfo: any, lang: string): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);
    const pageToken = lang === 'ar' ? 'ar' : '';

    const { error } = await supabase
      .from('google_reviews_cache')
      .upsert({
        place_id: placeId,
        page_token: pageToken,
        review_data: reviews,
        stats_data: stats,
        place_info: placeInfo,
        cached_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'place_id,page_token'
      });

    if (error) console.error('Cache storage error:', error);
    else console.log(`Reviews cached (lang=${lang})`);
  } catch (err) {
    console.error('Cache storage exception:', err);
  }
}

async function fetchReviewsFromSerper(page: number = 1, lang: string = 'en'): Promise<{ reviews: SerperReview[]; stats: any } | null> {
  if (!serperApiKey) {
    console.error('SERPER_API_KEY not found');
    return null;
  }

  const hl = lang === 'ar' ? 'ar' : 'en';
  console.log(`Fetching reviews from Serper.dev (page ${page}, hl=${hl})...`);

  const response = await fetch('https://google.serper.dev/reviews', {
    method: 'POST',
    headers: {
      'X-API-KEY': serperApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      placeId: PANDA_CAKES_PLACE_ID,
      gl: 'qa',
      hl: hl,
      sortBy: 'mostRelevant',
      num: 20,
      page: page,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Serper Reviews API error:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  console.log(`Fetched ${data.reviews?.length || 0} reviews (page ${page}, hl=${hl})`);

  return {
    reviews: data.reviews || [],
    stats: {
      rating: data.rating || PANDA_CAKES_INFO.rating,
      totalReviews: PANDA_CAKES_INFO.reviewsCount
    }
  };
}

function processReviews(rawReviews: SerperReview[]): any[] {
  const filtered = rawReviews.filter(review => {
    const authorName = (review.user?.name || '').toLowerCase().trim();
    return !BLACKLISTED_AUTHORS.some(blocked => authorName.includes(blocked));
  });
  
  const transformed = filtered.map((review, index) => ({
    id: `review-${index}-${(review.user?.name || 'anon').replace(/\s+/g, '-').substring(0, 20)}`,
    author: review.user?.name || 'Anonymous',
    rating: review.rating || 5,
    date: review.date || '',
    text: review.snippet || '',
    authorImage: review.user?.thumbnail || null,
    isLocalGuide: false,
    reviewCount: review.user?.reviews || 0,
    images: review.media?.filter(m => m.type === 'image').map(m => m.imageUrl).filter(Boolean) || [],
    helpfulVotes: review.likes || 0,
    platform: 'Google Reviews',
  }));

  return transformed.sort((a, b) => {
    const aHasText = a.text && a.text.trim().length > 0;
    const bHasText = b.text && b.text.trim().length > 0;
    if (aHasText && !bHasText) return -1;
    if (!aHasText && bHasText) return 1;
    return b.rating - a.rating;
  });
}

function estimateRatingDistribution(averageRating: number, totalReviews: number): { 5: number; 4: number; 3: number; 2: number; 1: number } {
  const avg = Math.min(5, Math.max(1, averageRating || 4.8));
  const total = totalReviews || 100;
  
  let fiveStarPct: number, fourStarPct: number, threeStarPct: number, twoStarPct: number, oneStarPct: number;
  
  if (avg >= 4.8) {
    fiveStarPct = 0.85 + (avg - 4.8) * 0.5;
    fourStarPct = 0.08 - (avg - 4.8) * 0.2;
    threeStarPct = 0.04 - (avg - 4.8) * 0.1;
    twoStarPct = 0.02 - (avg - 4.8) * 0.05;
    oneStarPct = 0.01 - (avg - 4.8) * 0.05;
  } else if (avg >= 4.5) {
    fiveStarPct = 0.70 + (avg - 4.5) * 0.5;
    fourStarPct = 0.15 - (avg - 4.5) * 0.23;
    threeStarPct = 0.08 - (avg - 4.5) * 0.13;
    twoStarPct = 0.04 - (avg - 4.5) * 0.07;
    oneStarPct = 0.03 - (avg - 4.5) * 0.07;
  } else if (avg >= 4.0) {
    fiveStarPct = 0.50 + (avg - 4.0) * 0.4;
    fourStarPct = 0.25 - (avg - 4.0) * 0.2;
    threeStarPct = 0.12 - (avg - 4.0) * 0.08;
    twoStarPct = 0.07 - (avg - 4.0) * 0.06;
    oneStarPct = 0.06 - (avg - 4.0) * 0.06;
  } else {
    fiveStarPct = Math.max(0.10, avg / 10);
    fourStarPct = 0.20;
    threeStarPct = 0.25;
    twoStarPct = 0.25;
    oneStarPct = 1 - fiveStarPct - fourStarPct - threeStarPct - twoStarPct;
  }
  
  fiveStarPct = Math.max(0, fiveStarPct);
  fourStarPct = Math.max(0, fourStarPct);
  threeStarPct = Math.max(0, threeStarPct);
  twoStarPct = Math.max(0, twoStarPct);
  oneStarPct = Math.max(0, oneStarPct);
  
  const totalPct = fiveStarPct + fourStarPct + threeStarPct + twoStarPct + oneStarPct;
  
  return {
    5: Math.round((fiveStarPct / totalPct) * total),
    4: Math.round((fourStarPct / totalPct) * total),
    3: Math.round((threeStarPct / totalPct) * total),
    2: Math.round((twoStarPct / totalPct) * total),
    1: Math.round((oneStarPct / totalPct) * total),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { place_id, force_refresh, page = 1, language = 'en' } = await req.json();
    const placeId = place_id || 'panda-cakes-qatar';
    const lang = language === 'ar' ? 'ar' : 'en';

    console.log(`Reviews request - force_refresh: ${force_refresh}, page: ${page}, lang: ${lang}`);

    const isPagination = page > 1;

    if (!force_refresh && !isPagination) {
      const { data: cached, isStale } = await getCachedReviews(placeId, lang);
      if (cached) {
        console.log(`Returning ${cached.review_data.length} cached reviews (lang=${lang}, stale: ${isStale})`);
        
        if (isStale) {
          EdgeRuntime.waitUntil(backgroundRefresh(placeId, lang));
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            reviews: cached.review_data,
            stats: cached.stats_data,
            placeInfo: cached.place_info,
            pagination: { page: 1, hasMore: true },
            fromCache: true,
            isStale,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const reviewsResult = await fetchReviewsFromSerper(page, lang);
    
    if (!reviewsResult && isPagination) {
      return new Response(
        JSON.stringify({
          success: true,
          reviews: [],
          stats: null,
          pagination: { page, hasMore: false },
          message: 'No additional reviews available'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!reviewsResult) {
      throw new Error('Failed to fetch reviews from Serper.dev');
    }

    const reviews = processReviews(reviewsResult.reviews);
    const ratingDistribution = estimateRatingDistribution(reviewsResult.stats.rating, reviewsResult.stats.totalReviews);
    
    const stats = {
      averageRating: reviewsResult.stats.rating,
      totalReviews: reviewsResult.stats.totalReviews,
      ratingDistribution,
    };

    if (!isPagination) {
      await cacheReviews(placeId, reviews, stats, PANDA_CAKES_INFO, lang);
    }

    const hasMore = reviews.length >= 5;

    return new Response(
      JSON.stringify({
        success: true,
        reviews,
        stats,
        pagination: { page, hasMore },
        placeInfo: PANDA_CAKES_INFO,
        fromCache: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
