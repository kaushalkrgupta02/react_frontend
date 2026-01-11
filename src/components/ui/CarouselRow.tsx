import { useRef, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselRowProps {
  children: ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  showArrows?: boolean;
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
};

export default function CarouselRow({ 
  children, 
  className,
  gap = 'md',
  showArrows = false,
}: CarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative group">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className={cn(
          "flex overflow-x-auto scrollbar-hide snap-x scroll-pl-4 pb-2 -mx-4 px-4",
          gapClasses[gap],
          className
        )}
      >
        {children}
      </div>

      {/* Arrow controls - desktop only */}
      {showArrows && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-card hidden md:flex"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-card hidden md:flex"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-2 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-2 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none" />
    </div>
  );
}