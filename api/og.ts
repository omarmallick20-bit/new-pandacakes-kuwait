import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qlffjhyciwabyzolzdjb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZmZqaHljaXdhYnl6b2x6ZGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0ODA1MjYsImV4cCI6MjA3MDA1NjUyNn0.ZvVzOhXzYYNa_BgYCIKnWw6bz0n2-R8LUdMjLv2A110';

// Social media crawler User-Agent patterns
const CRAWLER_PATTERNS = /facebookexternalhit|Facebot|Twitterbot|WhatsApp|Instagram|Pinterest|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot/i;

interface CakeData {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
}

async function fetchCakeData(cakeId: string): Promise<CakeData | null> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, image_url, price')
      .eq('id', cakeId)
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.error('Failed to fetch cake:', error);
      return null;
    }
    
    return data as CakeData;
  } catch (err) {
    console.error('Error fetching cake data:', err);
    return null;
  }
}

function generateOGHtml(cake: CakeData | null, origin: string, cakeId: string): string {
  const title = cake ? `${cake.name} - PANDA CAKES` : 'PANDA CAKES I Kuwait I Birthday Cakes I Custom Cakes I Same Day Delivery';
  const description = cake?.description || 'Discover handcrafted cakes, cupcakes, and sweet treats at PANDA CAKES Kuwait.';
  const imageUrl = cake?.image_url || `${origin}/og-image.png`;
  const pageUrl = `${origin}/cake/${cakeId}`;
  const price = cake ? `${cake.price} KWD` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Primary Meta Tags -->
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook / Instagram / WhatsApp -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="PANDA CAKES Kuwait">
  ${price ? `<meta property="product:price:amount" content="${cake?.price}">
  <meta property="product:price:currency" content="KWD">` : ''}
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
  ${cake?.image_url ? `<img src="${imageUrl}" alt="${cake.name}">` : ''}
  <script>
    // Redirect regular users to the actual page
    if (!/facebookexternalhit|Facebot|Twitterbot|WhatsApp|Instagram|Pinterest|LinkedInBot|Slackbot|TelegramBot|Discordbot|Googlebot|bingbot/i.test(navigator.userAgent)) {
      window.location.replace('${pageUrl}');
    }
  </script>
</body>
</html>`;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userAgent = req.headers.get('user-agent') || '';
  const pathname = url.pathname;
  
  // Only handle /cake/:id routes
  if (!pathname.startsWith('/cake/')) {
    // Pass through to the SPA
    return fetch(req);
  }
  
  // Check if it's a social media crawler
  const isCrawler = CRAWLER_PATTERNS.test(userAgent);
  
  if (!isCrawler) {
    // Not a crawler - let the request pass through to React app
    return fetch(req);
  }
  
  // Extract cake ID from path
  const cakeId = pathname.replace('/cake/', '').split('/')[0].split('?')[0];
  
  if (!cakeId) {
    return fetch(req);
  }
  
  console.log(`OG Handler: Crawler detected for cake ${cakeId}, User-Agent: ${userAgent.substring(0, 50)}`);
  
  // Fetch cake data from Supabase
  const cake = await fetchCakeData(cakeId);
  
  // Generate HTML with OG tags
  const origin = url.origin;
  const html = generateOGHtml(cake, origin, cakeId);
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
