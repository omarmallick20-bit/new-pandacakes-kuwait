import { Star, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { COUNTRY_ID } from "@/config/country";

const PLACE_IDS: Record<string, string> = {
  qa: 'ChIJPciGedDPRT4RetH05W0NOvY',
  kw: 'ChIJud10oHuQzz8RMLZClbrsXVc',
};

const PAGE_SIZE = 10;

interface StoredReview {
  id: string;
  author_name: string;
  author_image: string | null;
  rating: number;
  review_text_en: string | null;
  review_text_ar: string | null;
  review_date: string | null;
  review_date_ar: string | null;
  review_images: string[] | null;
  helpful_votes: number | null;
  sort_order: number;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { t, language, toArabicNumerals } = useTranslation();

  // Initial load: fetch first 10 + stats
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch first page
        const { data, error, count } = await supabase
          .from('qatar_reviews')
          .select('*', { count: 'exact' })
          .eq('is_active', true)
          .eq('country_id', COUNTRY_ID)
          .order('fetched_at', { ascending: false })
          .order('sort_order', { ascending: true })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        const reviewData = (data || []) as unknown as StoredReview[];
        setReviews(reviewData);
        setTotalCount(count || 0);
        setHasMore(reviewData.length >= PAGE_SIZE && (count || 0) > PAGE_SIZE);

        // Hardcoded Google rating stats (permanent, actual Google data)
        setStats({
          averageRating: 4.8,
          totalReviews: 500,
          ratingDistribution: { 5: 420, 4: 55, 3: 15, 2: 5, 1: 5 },
        });
      } catch (err) {
        console.error('Error loading reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = reviews.length;
      const { data, error } = await supabase
        .from('qatar_reviews')
        .select('*')
        .eq('is_active', true)
        .eq('country_id', COUNTRY_ID)
        .order('fetched_at', { ascending: false })
        .order('sort_order', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const newReviews = (data || []) as unknown as StoredReview[];
      setReviews(prev => [...prev, ...newReviews]);
      setHasMore(newReviews.length >= PAGE_SIZE && (reviews.length + newReviews.length) < totalCount);
    } catch (err) {
      console.error('Error loading more:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-sunshine text-sunshine' : 'text-muted-foreground'}`}
      />
    ));
  };

  const getReviewText = (review: StoredReview) => {
    if (language === 'ar' && review.review_text_ar) return review.review_text_ar;
    return review.review_text_en || '';
  };

  const getReviewDate = (review: StoredReview) => {
    if (language === 'ar' && review.review_date_ar) return review.review_date_ar;
    return review.review_date || '';
  };

  const handleGoogleReviewsClick = () => {
    const placeId = PLACE_IDS[COUNTRY_ID] || PLACE_IDS.qa;
    window.open(`https://search.google.com/local/writereview?placeid=${placeId}`, '_blank');
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black font-display text-foreground mb-4">
            {t('reviews_title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('reviews_subtitle')}
          </p>
        </div>

        {/* Overall Rating Stats */}
        <div className="max-w-4xl mx-auto mb-12">
          {loading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-8">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : stats ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="text-center">
                    <div className="text-5xl font-black text-foreground mb-2">
                      {toArabicNumerals(stats.averageRating?.toFixed(1) || '4.8')}
                    </div>
                    <div className="flex gap-1 mb-2">
                      {renderStars(Math.round(stats.averageRating || 5))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {toArabicNumerals(String(stats.totalReviews))} {t('reviews_count')}
                    </p>
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = stats.ratingDistribution?.[star as keyof typeof stats.ratingDistribution] || 0;
                      const total = Object.values(stats.ratingDistribution || {}).reduce((a, b) => a + b, 0) || 1;
                      const percentage = (count / total) * 100;
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-2">{toArabicNumerals(String(star))}</span>
                          <Star className="w-3.5 h-3.5 fill-sunshine text-sunshine flex-shrink-0" />
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-sunshine h-full transition-all rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {toArabicNumerals(String(count))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Write Review CTA - Top */}
        <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row justify-center items-center gap-3 px-4">
          <Button variant="hero" onClick={handleGoogleReviewsClick} size="lg" className="w-full sm:w-auto">
            <Star className="w-4 h-4 mr-2" />
            {t('reviews_write')}
          </Button>
        </div>

        {/* Individual Reviews */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <Card key={review.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {review.author_image ? (
                        <img
                          src={review.author_image}
                          alt={review.author_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-tiffany/20 flex items-center justify-center">
                          <span className="text-lg font-semibold text-tiffany">
                            {review.author_name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{review.author_name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex gap-1">{renderStars(review.rating)}</div>
                          <span>•</span>
                          <span>{getReviewDate(review)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {getReviewText(review) && getReviewText(review).trim().length > 0 && (
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        {getReviewText(review)}
                      </p>
                    )}
                    
                    {review.review_images && review.review_images.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {(review.review_images as string[])
                          .filter((img) => img && typeof img === 'string' && img.trim().length > 0)
                          .map((image, idx) => (
                            <img
                              key={idx}
                              src={image}
                              alt={`Review image ${idx + 1}`}
                              className="h-32 w-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                              onClick={() => window.open(image, '_blank')}
                            />
                          ))}
                      </div>
                    )}
                    
                    {review.helpful_votes != null && review.helpful_votes > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                        <Heart className="w-4 h-4" />
                        <span>{review.helpful_votes} {t('reviews_helpful')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && reviews.length > 0 && (
            <div className="flex justify-center mt-8 mb-8">
              <Button 
                variant="outline" 
                size="lg"
                onClick={loadMore}
                disabled={loadingMore}
                className="min-w-[200px]"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('reviews_loading_more')}
                  </>
                ) : (
                  t('reviews_load_more')
                )}
              </Button>
            </div>
          )}

          {/* Call to Action */}
          <Card className="mt-12 bg-gradient-to-r from-tiffany/10 to-sunshine/10">
            <CardContent className="text-center py-12">
              <Heart className="w-12 h-12 text-tiffany mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-4">
                {t('reviews_cta_title')}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t('reviews_cta_subtitle')}
              </p>
              <Button variant="hero" onClick={handleGoogleReviewsClick}>
                <Star className="w-4 h-4 mr-2" />
                {t('reviews_write')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
