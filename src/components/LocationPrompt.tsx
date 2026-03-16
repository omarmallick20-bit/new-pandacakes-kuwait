import { useState } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface LocationPromptProps {
  onLocationObtained: (lat: number, lng: number) => void;
  onSkip: () => void;
}

export function LocationPrompt({ onLocationObtained, onSkip }: LocationPromptProps) {
  const [isLocating, setIsLocating] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      onSkip();
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onLocationObtained(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsLocating(false);
        console.error('Geolocation error:', error.code, error.message);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enable location permissions or enter your address manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location unavailable. Please enter your address manually.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out. Please try again or enter manually.');
            break;
          default:
            toast.error('Unable to get your location. Please enter manually.');
        }
        onSkip();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 space-y-6 text-center">
      <div className="w-16 h-16 bg-tiffany/10 rounded-full flex items-center justify-center">
        <MapPin className="w-8 h-8 text-tiffany" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">Share Your Location</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          For accurate delivery, please share your current location. This helps our drivers find you easily.
        </p>
      </div>

      <Button
        onClick={handleUseCurrentLocation}
        disabled={isLocating}
        className="w-full max-w-xs"
        size="lg"
      >
        {isLocating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Detecting Location...
          </>
        ) : (
          <>
            <Navigation className="mr-2 h-5 w-5" />
            Use My Current Location
          </>
        )}
      </Button>

      <button
        type="button"
        onClick={onSkip}
        disabled={isLocating}
        className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
      >
        Enter address manually instead
      </button>
    </div>
  );
}
