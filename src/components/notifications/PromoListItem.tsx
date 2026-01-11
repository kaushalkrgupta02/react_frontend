import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import type { Promo } from '@/hooks/usePromos';

interface PromoListItemProps {
  promo: Promo;
  onClick: () => void;
}

export default function PromoListItem({ promo, onClick }: PromoListItemProps) {
  const validUntil = format(new Date(promo.ends_at), 'MMM d, yyyy');

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 hover:bg-secondary/50 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
        <img
          src={promo.image_url}
          alt={promo.title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm text-foreground line-clamp-1">
          {promo.title}
        </h4>
        {promo.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {promo.subtitle}
          </p>
        )}
        <p className="text-xs text-primary mt-1">
          Valid until {validUntil}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}