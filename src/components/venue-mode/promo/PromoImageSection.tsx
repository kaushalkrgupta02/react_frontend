import { useState, useRef, ChangeEvent } from 'react';
import { ImageIcon, Upload, Wand2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_PROMO_IMAGE = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800';

interface PromoImageSectionProps {
  venueId?: string;
  promoTitle?: string;
  promoDescription?: string;
  imageUrl: string;
  onImageChange: (url: string) => void;
}

export default function PromoImageSection({
  venueId,
  promoTitle,
  promoDescription,
  imageUrl,
  onImageChange,
}: PromoImageSectionProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [showImageOptions, setShowImageOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `promo-${venueId || 'default'}-${Date.now()}.${fileExt}`;
      const filePath = `promo-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promo-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          onImageChange(dataUrl);
          toast.success('Image loaded locally');
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: publicUrl } = supabase.storage
        .from('promo-images')
        .getPublicUrl(filePath);

      onImageChange(publicUrl.publicUrl);
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      setShowImageOptions(false);
    }
  };

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-promo-image', {
        body: { 
          prompt: imagePrompt.trim() || undefined,
          promoTitle: promoTitle || 'Special Promotion',
          promoDescription: promoDescription || 'Exclusive offer',
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageChange(data.imageUrl);
        toast.success('AI image generated!');
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        throw new Error('No image returned');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Using default.');
    } finally {
      setIsGeneratingImage(false);
      setImagePrompt('');
      setShowImageOptions(false);
    }
  };

  const resetImage = () => {
    onImageChange(DEFAULT_PROMO_IMAGE);
    toast.success('Image reset to default');
    setShowImageOptions(false);
  };

  return (
    <div className="space-y-3">
      {/* Image Preview */}
      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl overflow-hidden">
        <img
          src={imageUrl || DEFAULT_PROMO_IMAGE}
          alt="Promo"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_PROMO_IMAGE;
          }}
        />
        
        {/* Loading overlay */}
        {(isUploadingImage || isGeneratingImage) && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {isUploadingImage ? 'Uploading...' : 'Generating AI image...'}
              </p>
            </div>
          </div>
        )}
        
        {/* Change Image button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-2 right-2 gap-1 bg-background/90 backdrop-blur-sm"
          onClick={() => setShowImageOptions(!showImageOptions)}
        >
          <ImageIcon className="w-3 h-3" />
          Change Image
        </Button>
      </div>
      
      {/* Image Options Panel */}
      {showImageOptions && (
        <div className="p-3 bg-card rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Promo Image</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImageOptions(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Upload/Reset Options */}
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage || isGeneratingImage}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetImage}
              disabled={isUploadingImage || isGeneratingImage || imageUrl === DEFAULT_PROMO_IMAGE}
              className="w-full"
            >
              Reset Default
            </Button>
          </div>
          
          {/* AI Generation Option */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wand2 className="w-3 h-3" />
              <span>Or generate with AI</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe your image (optional)..."
                className="flex-1 text-sm"
                disabled={isGeneratingImage}
              />
              <Button
                size="sm"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || isUploadingImage}
                className="px-3 bg-primary"
              >
                {isGeneratingImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Leave empty to auto-generate based on promo details
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_PROMO_IMAGE };
