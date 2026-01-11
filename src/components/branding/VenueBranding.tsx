import { memo } from 'react';
import { Building2 } from 'lucide-react';

interface VenueBrandingProps {
  logoUrl?: string | null;
  venueName?: string;
  subtitle?: string;
  className?: string;
}

const VenueBranding = memo(function VenueBranding({ 
  logoUrl, 
  venueName = 'Venue Manager', 
  subtitle = 'Staff Portal',
  className = '' 
}: VenueBrandingProps) {
  return (
    <div className={`text-center ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={`${venueName} logo`}
            className="w-full h-full object-cover"
          />
        ) : (
          <Building2 className="w-8 h-8 text-primary" />
        )}
      </div>
      <h1 className="text-2xl font-bold text-foreground">{venueName}</h1>
      <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
    </div>
  );
});

export default VenueBranding;
