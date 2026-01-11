import { memo } from 'react';
import simplifyLogo from '@/assets/simplify-logo.png';

interface PoweredBySimplifyProps {
  className?: string;
}

const PoweredBySimplify = memo(function PoweredBySimplify({ className = '' }: PoweredBySimplifyProps) {
  return (
    <div className={`flex items-center justify-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span>Powered by</span>
      <img src={simplifyLogo} alt="Simplify" className="h-4 w-4" />
      <span className="font-semibold text-primary">Simplify</span>
    </div>
  );
});

export default PoweredBySimplify;
