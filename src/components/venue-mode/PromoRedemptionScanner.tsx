import { useState, useEffect, useRef } from 'react';
import { QrCode, Camera, Check, X, Search, Gift } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { trackPromoRedemption } from '@/hooks/useAnalyticsTracking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PromoRedemptionScannerProps {
  venueId: string;
  children: React.ReactNode;
}

interface PromoDetails {
  id: string;
  title: string;
  subtitle: string | null;
  promo_code: string | null;
  discount_type: string | null;
  discount_value: number | null;
  current_redemptions: number | null;
  max_redemptions: number | null;
  ends_at: string;
  venue_id: string | null;
}

export default function PromoRedemptionScanner({ venueId, children }: PromoRedemptionScannerProps) {
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundPromo, setFoundPromo] = useState<PromoDetails | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [revenueAmount, setRevenueAmount] = useState('');
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setScanMode('camera');
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Use manual entry instead.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanMode('manual');
  };

  const searchPromo = async (code: string) => {
    if (!code.trim()) return;
    
    setIsSearching(true);
    setFoundPromo(null);

    try {
      const { data, error } = await supabase
        .from('promos')
        .select('id, title, subtitle, promo_code, discount_type, discount_value, current_redemptions, max_redemptions, ends_at, venue_id')
        .or(`promo_code.ilike.${code},id.eq.${code}`)
        .eq('is_active', true)
        .gte('ends_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if promo is for this venue or global
        if (data.venue_id && data.venue_id !== venueId) {
          toast.error('This promo is not valid for this venue');
          return;
        }
        setFoundPromo(data);
      } else {
        toast.error('Promo code not found or expired');
      }
    } catch (error) {
      console.error('Promo search error:', error);
      toast.error('Failed to search promo');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRedeem = async () => {
    if (!foundPromo) return;

    // Check max redemptions
    if (foundPromo.max_redemptions && (foundPromo.current_redemptions || 0) >= foundPromo.max_redemptions) {
      toast.error('This promo has reached maximum redemptions');
      return;
    }

    setIsRedeeming(true);
    try {
      const revenue = revenueAmount ? parseFloat(revenueAmount) : undefined;
      const result = await trackPromoRedemption(foundPromo.id, venueId, revenue);

      if (result.success) {
        toast.success('Promo redeemed successfully!');
        setFoundPromo(null);
        setManualCode('');
        setRevenueAmount('');
        setOpen(false);
      } else {
        throw new Error('Failed to redeem');
      }
    } catch (error) {
      toast.error('Failed to redeem promo');
    } finally {
      setIsRedeeming(false);
    }
  };

  const getDiscountDisplay = () => {
    if (!foundPromo) return '';
    if (foundPromo.discount_type === 'percentage') {
      return `${foundPromo.discount_value}% off`;
    } else if (foundPromo.discount_type === 'fixed') {
      return `Rp ${(foundPromo.discount_value || 0).toLocaleString()} off`;
    }
    return 'Special offer';
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        stopCamera();
        setFoundPromo(null);
        setManualCode('');
      }
    }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Redeem Promo
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => {
                stopCamera();
                setScanMode('manual');
              }}
            >
              <Search className="w-4 h-4 mr-1" />
              Enter Code
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={startCamera}
            >
              <Camera className="w-4 h-4 mr-1" />
              Scan QR
            </Button>
          </div>

          {/* Manual Entry */}
          {scanMode === 'manual' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button 
                  onClick={() => searchPromo(manualCode)}
                  disabled={isSearching || !manualCode.trim()}
                >
                  {isSearching ? '...' : 'Find'}
                </Button>
              </div>
            </div>
          )}

          {/* Camera View */}
          {scanMode === 'camera' && (
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                Point camera at QR code
              </p>
            </div>
          )}

          {/* Found Promo Card */}
          {foundPromo && (
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{foundPromo.title}</h3>
                    {foundPromo.subtitle && (
                      <p className="text-sm text-muted-foreground">{foundPromo.subtitle}</p>
                    )}
                  </div>
                  <div className="px-2 py-1 bg-primary/20 rounded text-sm font-medium text-primary">
                    {getDiscountDisplay()}
                  </div>
                </div>

                {/* Code Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded">
                  <Gift className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{foundPromo.promo_code || foundPromo.id.slice(0, 8)}</span>
                </div>

                {/* Redemption Count */}
                {foundPromo.max_redemptions && (
                  <p className="text-xs text-muted-foreground">
                    {foundPromo.current_redemptions || 0} / {foundPromo.max_redemptions} redeemed
                  </p>
                )}

                {/* Revenue Input */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Transaction amount (optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount in IDR..."
                    value={revenueAmount}
                    onChange={(e) => setRevenueAmount(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setFoundPromo(null);
                      setManualCode('');
                    }}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    {isRedeeming ? 'Redeeming...' : 'Confirm Redemption'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!foundPromo && (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Enter a promo code or scan a QR code to redeem
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
