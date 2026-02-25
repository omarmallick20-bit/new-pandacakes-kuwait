import { useState, useEffect } from "react";
import { Heart, ShoppingCart, Menu, Search, Globe, ChevronLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/ThemeProvider";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useTranslation } from "@/hooks/useTranslation";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useAppContext();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, language, toggleLanguage } = useTranslation();
  
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const isActive = (path: string): boolean => location.pathname === path;
  const isOnCategoryPage = location.pathname.startsWith('/category/');
  const showMobileBackButton = isScrolled && isOnCategoryPage;
  const handleBackClick = () => navigate(-1);
  const cartItemCount = state.cart.reduce((total, item) => total + item.quantity, 0);
  const wishlistItemCount = state.wishlist.length;

  const langButtonLabel = language === 'en' ? 'عر' : 'En';

  return <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-14 items-center px-2 md:px-4 mx-auto max-w-7xl">
        {/* Logo */}
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <img src="/logo.png" alt="Panda Cakes Logo" className="h-10 w-10 rounded-lg" />
            <span className="hidden font-bold sm:inline-block text-2xl font-display text-foreground">
              {t('brand_name')}
            </span>
          </Link>
        </div>

        {/* Mobile menu or back button */}
        {showMobileBackButton ? (
          <Button variant="ghost" size="icon" onClick={handleBackClick}
            className="mr-2 md:hidden rounded-full hover:bg-tiffany/10 text-tiffany transition-all duration-300 animate-in fade-in slide-in-from-left-5"
            aria-label="Go back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <nav className="flex flex-col space-y-3">
              <Link to="/" className="flex items-center space-x-2 font-bold text-xl font-display text-foreground">
                <img src="/logo.png" alt="Panda Cakes Logo" className="h-8 w-8" />
              {t('brand_name')}
            </Link>
              <Button variant="outline" className={`justify-start transition-colors hover:text-foreground/80 ${isActive("/") ? "text-foreground" : "text-foreground/60"}`} onClick={() => { navigate("/"); setIsMobileMenuOpen(false); }}>
                {t('nav_order')}
              </Button>
              <Button variant="outline" className={`justify-start transition-colors hover:text-foreground/80 ${isActive("/faqs") ? "text-foreground" : "text-foreground/60"}`} onClick={() => { navigate("/faqs"); setIsMobileMenuOpen(false); }}>
                {t('nav_faqs')}
              </Button>
              <Button variant="outline" className={`justify-start transition-colors hover:text-foreground/80 ${isActive("/reviews") ? "text-foreground" : "text-foreground/60"}`} onClick={() => { navigate("/reviews"); setIsMobileMenuOpen(false); }}>
                {t('nav_reviews')}
              </Button>
              <Button variant="outline" className={`justify-start transition-colors hover:text-foreground/80 ${isActive("/contact") ? "text-foreground" : "text-foreground/60"}`} onClick={() => { navigate("/contact"); setIsMobileMenuOpen(false); }}>
                {t('nav_contact')}
              </Button>
              
              <Separator className="my-2" />
              
              <div className="flex items-center justify-around gap-2 pt-2">
                <Button variant="outline" size="icon"
                  onClick={() => { window.open("https://pandacakes.me", "_blank", "noopener,noreferrer"); setIsMobileMenuOpen(false); }}
                  aria-label="Visit website">
                  <Globe className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="relative"
                  onClick={() => { navigate("/wishlist"); setIsMobileMenuOpen(false); }}
                  aria-label="Wishlist">
                  <Heart className="h-4 w-4" />
                  {wishlistItemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-tiffany text-background border-0">
                      {wishlistItemCount}
                    </Badge>
                  )}
                </Button>
                <Button variant="outline" size="icon"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  aria-label="Toggle theme">
                  <ThemeToggle />
                </Button>
                <Button variant="outline" size="icon"
                  onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }}
                  aria-label="Toggle language"
                  className="font-semibold text-xs">
                  {langButtonLabel}
                </Button>
              </div>
            </nav>
          </SheetContent>
          </Sheet>
        )}

        {/* Mobile Logo */}
        <div className="flex md:hidden">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.png" alt="Panda Cakes Logo" className="h-7 w-7 rounded-lg" />
            <span className="font-bold text-xs md:text-lg font-display text-foreground whitespace-nowrap">
              {t('brand_name')} 🇶🇦
            </span>
          </Link>
        </div>

        {/* Desktop navigation */}
        <nav className="flex items-center space-x-6 text-sm font-medium ml-6 hidden md:flex">
          <Link to="/" className={`transition-colors hover:text-foreground/80 ${isActive("/") ? "text-foreground" : "text-foreground/60"}`}>
            {t('nav_order')}
          </Link>
          <Link to="/faqs" className={`transition-colors hover:text-foreground/80 ${isActive("/faqs") ? "text-foreground" : "text-foreground/60"}`}>
            {t('nav_faqs')}
          </Link>
          <Link to="/reviews" className={`transition-colors hover:text-foreground/80 ${isActive("/reviews") ? "text-foreground" : "text-foreground/60"}`}>
            {t('nav_reviews')}
          </Link>
          <Link to="/contact" className={`transition-colors hover:text-foreground/80 ${isActive("/contact") ? "text-foreground" : "text-foreground/60"}`}>
            {t('nav_contact')}
          </Link>
        </nav>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none" />
          
          <nav className="flex items-center space-x-1 md:space-x-2">
            {/* Search Button - Mobile */}
            <Button variant="ghost" size="sm" className="md:hidden px-1.5"
              onClick={() => setIsSearchModalOpen(true)} aria-label="Search cakes">
              <Search className="h-4 w-4" />
            </Button>

            {/* Language Toggle - Mobile */}
            <Button variant="ghost" size="sm" className="md:hidden font-semibold text-xs px-1.5"
              onClick={toggleLanguage} aria-label="Toggle language">
              {langButtonLabel}
            </Button>

            {/* Search Button - Desktop */}
            <Button variant="ghost" size="sm" className="hidden md:flex"
              onClick={() => setIsSearchModalOpen(true)} aria-label="Search cakes">
              <Search className="h-4 w-4" />
            </Button>

            {/* Language Toggle - Desktop */}
            <Button variant="ghost" size="sm" className="hidden md:flex font-semibold text-xs px-2"
              onClick={toggleLanguage} aria-label="Toggle language">
              {langButtonLabel}
            </Button>

            {/* Globe */}
            <Button variant="ghost" size="sm" className="hidden md:flex" onClick={() => window.open("https://pandacakes.me", "_blank", "noopener,noreferrer")} aria-label="Visit Panda Cakes website">
              <Globe className="h-4 w-4" />
            </Button>

            {/* Wishlist */}
            <Button variant="ghost" size="sm" className="hidden md:flex relative" onClick={() => navigate("/wishlist")}>
              <Heart className="h-4 w-4" />
              {wishlistItemCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-tiffany text-background text-xs font-medium flex items-center justify-center">
                  {wishlistItemCount}
                </span>}
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="sm" className="hidden md:flex relative" onClick={() => navigate("/cart")}>
              <ShoppingCart className="h-4 w-4" />
              {cartItemCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-tiffany text-background text-xs font-medium flex items-center justify-center">
                  {cartItemCount}
                </span>}
            </Button>

          {/* Mobile Cart Button */}
          <Button variant="ghost" size="sm" className="md:hidden relative px-1.5" 
            onClick={() => navigate("/cart")} aria-label="Shopping cart">
            <ShoppingCart className="h-4 w-4" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-tiffany text-background text-xs font-medium flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Button>

            {/* Authentication */}
            {user ? <ProfileDropdown /> : <Button variant="outline" size="sm" onClick={() => navigate("/login")} className="text-tiffany border-tiffany hover:bg-tiffany hover:text-background text-xs px-2 md:px-3 md:text-sm">
                {t('nav_login')}
              </Button>}

          {/* Desktop Theme Toggle */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          </nav>
        </div>
      </div>

      <GlobalSearchModal 
        open={isSearchModalOpen} 
        onOpenChange={setIsSearchModalOpen} 
      />
    </header>;
}
