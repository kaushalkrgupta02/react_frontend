import { useState } from 'react';
import { Sparkles, Megaphone, Trash2, Edit2, BookmarkPlus, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AdminVenue } from '@/hooks/useAdminVenues';
import { useVenuePromos } from '@/hooks/useVenuePromos';
import { usePromoTemplates, PromoTemplate } from '@/hooks/usePromoTemplates';
import AIPromoDesignerSheet from './AIPromoDesignerSheet';
import GeoTargetedPromoSheet from './GeoTargetedPromoSheet';
import PromoListCard from './PromoListCard';
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

interface PromosSettingsSectionProps {
  venues: AdminVenue[];
  selectedVenueId: string | null;
}

export default function PromosSettingsSection({ venues, selectedVenueId }: PromosSettingsSectionProps) {
  const { data: promos = [], isLoading: promosLoading, refetch: refetchPromos } = useVenuePromos(selectedVenueId || undefined);
  const { templates, defaultTemplates, customTemplates, deleteTemplate } = usePromoTemplates();
  const [showTemplates, setShowTemplates] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PromoTemplate | null>(null);

  const selectedVenue = venues.find(v => v.id === selectedVenueId);
  const venueName = selectedVenue?.name || 'Venue';

  const handlePromoCreated = () => {
    toast.success('Promo is now live!');
    refetchPromos();
  };

  const handleDeleteTemplate = () => {
    if (templateToDelete) {
      deleteTemplate(templateToDelete);
      toast.success('Template deleted');
      setTemplateToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleUseTemplate = (template: PromoTemplate) => {
    setSelectedTemplate(template);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">Promo Management</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Create AI-powered promotional campaigns for {venueName}.
      </p>

      {/* AI Create Button */}
      <div className="flex gap-2">
        <AIPromoDesignerSheet 
          venueId={selectedVenueId || undefined} 
          venueName={venueName} 
          onPromoCreated={handlePromoCreated}
          initialTemplate={selectedTemplate}
          onSheetClose={() => setSelectedTemplate(null)}
        >
          <Button className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Promo
          </Button>
        </AIPromoDesignerSheet>

        {selectedVenueId && (
          <GeoTargetedPromoSheet
            venueId={selectedVenueId}
            venueName={venueName}
            onPromoCreated={handlePromoCreated}
          >
            <Button variant="outline" className="flex-1">
              <MapPin className="w-4 h-4 mr-2" />
              Geo-Targeted
            </Button>
          </GeoTargetedPromoSheet>
        )}
      </div>

      {/* Templates Section */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">Templates</span>
            <span className="text-xs text-muted-foreground">({templates.length})</span>
          </div>
          {showTemplates ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showTemplates && (
          <div className="p-4 pt-0 space-y-3">
            {/* Default Templates */}
            {defaultTemplates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Quick Start</p>
                <div className="grid grid-cols-2 gap-2">
                  {defaultTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                      className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <span className="text-xl">{template.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{template.promoType}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Saved Templates</p>
                <div className="space-y-2">
                  {customTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30"
                    >
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        <span className="text-xl">{template.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{template.title}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTemplateToDelete(template.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Create a promo and save it as a template!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Promo List */}
      <PromoListCard promos={promos} isLoading={promosLoading} onPromoUpdated={refetchPromos} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
