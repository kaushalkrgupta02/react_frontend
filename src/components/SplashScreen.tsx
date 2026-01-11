import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-background via-background to-primary/5 flex flex-col items-center justify-center">
      {/* Splash Logo */}
      <div className="relative mb-8 animate-in fade-in zoom-in duration-700">
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
        <img 
          src="/splash-logo.png" 
          alt="Nightly" 
          className="relative w-32 h-32 sm:w-40 sm:h-40 object-contain drop-shadow-2xl"
          onError={(e) => {
            // Fallback to regular logo if splash logo doesn't exist
            (e.target as HTMLImageElement).src = '/logo.png';
          }}
        />
      </div>

      {/* App Name */}
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        Nightly
      </h1>
      
      {/* Tagline */}
      <p className="text-sm sm:text-base text-muted-foreground mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        Staff Management Portal
      </p>

      {/* Loading Indicator */}
      <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in duration-700 delay-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>

      {/* Version */}
      <div className="absolute bottom-8 text-xs text-muted-foreground/50 animate-in fade-in duration-700 delay-700">
        v1.0.0
      </div>
    </div>
  );
}
