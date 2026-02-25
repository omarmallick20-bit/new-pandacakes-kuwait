import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

export const ProfileAvatar = ({ size = 'md' }: ProfileAvatarProps) => {
  const { user, customerProfile } = useAuth();

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  };

  const getInitials = (): string | null => {
    if (customerProfile?.first_name && customerProfile?.last_name) {
      return `${customerProfile.first_name.charAt(0)}${customerProfile.last_name.charAt(0)}`;
    }
    if (user?.email && !user.email.includes('@temp.pandacakes.qa')) {
      return user.email.charAt(0).toUpperCase();
    }
    return null;
  };

  const displayImage = customerProfile?.profile_picture_url;

  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarImage src={displayImage} alt="Profile picture" />
      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
        {getInitials() || <User className="h-5 w-5" />}
      </AvatarFallback>
    </Avatar>
  );
};
