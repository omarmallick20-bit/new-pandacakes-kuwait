import { useState } from "react";
import { User, LogOut, Heart } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppContext } from "@/contexts/AppContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "./ProfileModal";
import { useTranslation } from "@/hooks/useTranslation";
export default function ProfileDropdown() {
  const {
    user,
    customerProfile,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { state } = useAppContext();
  const { t } = useTranslation();
  const wishlistCount = state.wishlist.length;
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState("profile");
  if (!user) return null;
  const getInitials = (): string | null => {
    const firstName = user.user_metadata?.first_name || '';
    const lastName = user.user_metadata?.last_name || '';
    if (firstName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    if (user.email && !user.email.includes('@temp.pandacakes.qa')) return user.email.charAt(0).toUpperCase();
    return null;
  };
  const getDisplayName = () => {
    const firstName = user.user_metadata?.first_name || '';
    const lastName = user.user_metadata?.last_name || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) return firstName;
    return user.email?.split('@')[0] || 'User';
  };

  const getDisplayEmail = () => {
    const email = user.email || '';
    
    // Check if it's a temporary email (phone-based signup)
    if (email.endsWith('@temp.pandacakes.qa')) {
      // Try to get phone from customerProfile first
      if (customerProfile?.whatsapp_number) {
        return customerProfile.whatsapp_number;
      }
      // Otherwise extract phone from the temp email
      return email.replace('@temp.pandacakes.qa', '');
    }
    
    return email;
  };
  const handleProfileClick = () => {
    setProfileTab("profile");
    setShowProfileModal(true);
  };
  const handleAddressesClick = () => {
    setProfileTab("addresses");
    setShowProfileModal(true);
  };
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/login';
    }
  };
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-tiffany text-background font-semibold">
              {getInitials() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-foreground">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {getDisplayEmail()}
            </p>
            <span 
              className="text-xs text-tiffany hover:underline cursor-pointer pt-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/terms');
              }}
            >
              {t('profile_terms')}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleProfileClick}>
          <User className="mr-2 h-4 w-4" />
          <span>{t('profile_my_profile')}</span>
        </DropdownMenuItem>
        
        {isMobile && (
          <DropdownMenuItem onClick={() => navigate('/wishlist')}>
            <Heart className="mr-2 h-4 w-4" />
            <span>{t('profile_my_wishlist')}</span>
            {wishlistCount > 0 && (
              <span className="ml-auto text-xs bg-tiffany text-white rounded-full px-2 py-0.5">
                {wishlistCount}
              </span>
            )}
          </DropdownMenuItem>
        )}
        
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('profile_sign_out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} defaultTab={profileTab} />
    </>;
}