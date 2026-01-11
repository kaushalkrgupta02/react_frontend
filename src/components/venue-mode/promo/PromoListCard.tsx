import { useState } from 'react';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar, 
  Users, 
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { VenuePromo, useTogglePromoStatus, useDeletePromo } from '@/hooks/useVenuePromos';
import PromoEditSheet from './PromoEditSheet';
import { toast } from 'sonner';

interface PromoListCardProps {
  promos: VenuePromo[];
  isLoading: boolean;
  onPromoUpdated?: () => void;
}

function getPromoStatus(promo: VenuePromo): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  const now = new Date();
  const startDate = new Date(promo.starts_at);
  const endDate = new Date(promo.ends_at);
  
  if (!promo.is_active) {
    return { label: 'Inactive', variant: 'secondary' };
  }
  
  if (isPast(endDate)) {
    return { label: 'Expired', variant: 'destructive' };
  }
  
  if (isFuture(startDate)) {
    return { label: 'Scheduled', variant: 'outline' };
  }
  
  if (isWithinInterval(now, { start: startDate, end: endDate })) {
    return { label: 'Active', variant: 'default' };
  }
  
  return { label: 'Unknown', variant: 'secondary' };
}

function PromoItem({ promo, onEdit, onUpdated }: { promo: VenuePromo; onEdit: (promo: VenuePromo) => void; onUpdated?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const toggleStatus = useTogglePromoStatus();
  const deletePromo = useDeletePromo();
  
  const status = getPromoStatus(promo);
  const isExpired = status.label === 'Expired';
  
  const handleCopyCode = () => {
    if (promo.promo_code) {
      navigator.clipboard.writeText(promo.promo_code);
      setCopiedCode(true);
      toast.success('Promo code copied!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleToggle = () => {
    toggleStatus.mutate({ promoId: promo.id, isActive: !promo.is_active });
  };

  const handleDelete = () => {
    deletePromo.mutate(promo.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <div className={`bg-card rounded-xl border border-border overflow-hidden transition-all ${isExpired ? 'opacity-60' : ''}`}>
        {/* Main Row */}
        <div className="flex items-center gap-3 p-3">
          {/* Image */}
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
            <img 
              src={promo.image_url} 
              alt={promo.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200';
              }}
            />
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-foreground truncate">{promo.title}</h4>
              {promo.ai_generated && (
                <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                {status.label}
              </Badge>
              {promo.promo_code && (
                <span className="text-xs text-muted-foreground font-mono">
                  {promo.promo_code}
                </span>
              )}
            </div>
          </div>
          
          {/* Toggle & Actions */}
          <div className="flex items-center gap-2">
            <Switch
              checked={promo.is_active}
              onCheckedChange={handleToggle}
              disabled={toggleStatus.isPending || isExpired}
            />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(promo)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Promo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </>
                  )}
                </DropdownMenuItem>
                {promo.promo_code && (
                  <DropdownMenuItem onClick={handleCopyCode}>
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        
        {/* Expanded Details */}
        {expanded && (
          <div className="px-3 pb-3 pt-0 space-y-3 border-t border-border/50 mt-0">
            <div className="pt-3 space-y-2">
              {promo.subtitle && (
                <p className="text-sm text-muted-foreground">{promo.subtitle}</p>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(new Date(promo.starts_at), 'MMM d')} - {format(new Date(promo.ends_at), 'MMM d, yyyy')}
                  </span>
                </div>
                
                {promo.target_audience && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span className="truncate">{promo.target_audience}</span>
                  </div>
                )}
                
                {promo.discount_type && promo.discount_value && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Tag className="w-3 h-3" />
                    <span>
                      {promo.discount_type === 'percentage' 
                        ? `${promo.discount_value}% off`
                        : promo.discount_type === 'bogo'
                        ? 'Buy One Get One'
                        : promo.discount_type === 'free_item'
                        ? 'Free Item'
                        : `${promo.discount_value} off`
                      }
                    </span>
                  </div>
                )}
                
                {(promo.current_redemptions !== null || promo.max_redemptions) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span>
                      {promo.current_redemptions || 0}
                      {promo.max_redemptions ? ` / ${promo.max_redemptions}` : ''} redeemed
                    </span>
                  </div>
                )}
              </div>
              
              {promo.terms_conditions && (
                <p className="text-[10px] text-muted-foreground/70 italic">
                  {promo.terms_conditions}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Promo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{promo.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePromo.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function PromoListCard({ promos, isLoading, onPromoUpdated }: PromoListCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [editingPromo, setEditingPromo] = useState<VenuePromo | null>(null);
  
  // Separate active and expired promos
  const sortedPromos = [...promos].sort((a, b) => {
    const aActive = a.is_active && !isPast(new Date(a.ends_at));
    const bActive = b.is_active && !isPast(new Date(b.ends_at));
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  const displayedPromos = showAll ? sortedPromos : sortedPromos.slice(0, 5);
  const hasMore = sortedPromos.length > 5;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (promos.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Tag className="w-6 h-6 text-primary" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No Promos Yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first promo using the AI Promo Designer above
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">
            All Promos ({promos.length})
          </h3>
          {hasMore && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowAll(!showAll)}
              className="text-xs h-7"
            >
              {showAll ? 'Show Less' : `Show All (${promos.length})`}
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          {displayedPromos.map((promo) => (
            <PromoItem 
              key={promo.id} 
              promo={promo} 
              onEdit={setEditingPromo}
              onUpdated={onPromoUpdated}
            />
          ))}
        </div>
      </div>
      
      {/* Edit Sheet */}
      <PromoEditSheet
        promo={editingPromo}
        open={!!editingPromo}
        onOpenChange={(open) => !open && setEditingPromo(null)}
        onSaved={onPromoUpdated}
      />
    </>
  );
}
