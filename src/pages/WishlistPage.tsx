import { useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { removeFromWishlistDB } from '@/utils/wishlistSync';
import { useTranslation } from '@/hooks/useTranslation';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleRemoveFromWishlist = async (item: typeof state.wishlist[0]) => {
    if (user) {
      await removeFromWishlistDB(user.id, item.cake.id);
    }
    dispatch({
      type: 'REMOVE_FROM_WISHLIST',
      payload: item.id
    });
    toast({
      title: t('wishlist_removed'),
      description: `${item.cake.name} ${t('wishlist_removed_desc')}`
    });
  };

  if (state.wishlist.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-4">{t('wishlist_empty')}</h1>
          <p className="text-muted-foreground mb-8">{t('wishlist_empty_desc')}</p>
          <Button onClick={() => navigate('/')} size="lg">
            {t('wishlist_browse')}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-black font-display text-foreground mb-8">{t('wishlist_title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.wishlist.map((item) => (
            <div key={item.id} className="bg-card rounded-3xl overflow-hidden shadow-lg relative">
              <button
                onClick={() => handleRemoveFromWishlist(item)}
                className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-colors"
                aria-label={`Remove ${item.cake.name} from wishlist`}
              >
                <Heart className="h-5 w-5 fill-current text-red-500" />
              </button>

              <div className="aspect-square">
                <img src={item.cake.image} alt={item.cake.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{item.cake.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{item.cake.description}</p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => navigate(`/cake/${item.cake.id}`)}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {t('common_order')}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
