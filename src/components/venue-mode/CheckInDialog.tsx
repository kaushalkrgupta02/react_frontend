import { useState, useRef, useEffect } from 'react';
import { QrCode, Keyboard, Camera, Loader2, Check, X, UserCheck, AlertTriangle, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { playCheckInSound } from '@/lib/audioFeedback';

interface GuestInfo {
  id: string;
  guest_number: number;
  guest_name: string | null;
  qr_code: string;
  check_in_status: string;
  is_primary: boolean;
  profile?: {
    display_name: string | null;
    phone: string | null;
  } | null;
}

interface BookingInfo {
  id: string;
  booking_reference: string;
  party_size: number;
  venue?: { name: string } | null;
}

interface CheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingReference: string;
  venueName: string;
  guestCount: number;
  onCheckIn: (outcome: 'showed' | 'no_show', spendAmount?: number, guestId?: string) => void;
  isProcessing?: boolean;
  bookingId?: string;
  venueId?: string;
  tableId?: string;
  guestName?: string;
}

export default function CheckInDialog({
  open,
  onOpenChange,
  bookingReference,
  venueName,
  guestCount,
  onCheckIn,
  isProcessing = false,
  bookingId,
  venueId,
  tableId,
  guestName: bookingGuestName,
}: CheckInDialogProps) {
  const [mode, setMode] = useState<'choose' | 'scan' | 'manual' | 'guest-found'>('choose');
  const [scannedCode, setScannedCode] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [foundGuest, setFoundGuest] = useState<GuestInfo | null>(null);
  const [foundBooking, setFoundBooking] = useState<BookingInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setMode('choose');
      setScannedCode('');
      setManualRef('');
      setSpendAmount('');
      setScanError(null);
      setFoundGuest(null);
      setFoundBooking(null);
      stopCamera();
    }
  }, [open]);

  const startCamera = async () => {
    setIsScanning(true);
    setScanError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      scanForQRCode();
    } catch (error) {
      console.error('Camera error:', error);
      setScanError('Unable to access camera. Please use manual check-in.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanForQRCode = () => {
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code']
      });

      const detect = async () => {
        if (!videoRef.current || !streamRef.current) return;
        
        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            handleScannedCode(code);
            return;
          }
        } catch (e) {
          // Continue scanning
        }
        
        if (streamRef.current) {
          requestAnimationFrame(detect);
        }
      };
      
      detect();
    } else {
      setTimeout(() => {
        if (isScanning && !scannedCode) {
          setScanError('QR scanner not supported. Please enter code manually.');
        }
      }, 5000);
    }
  };

  const handleScannedCode = async (code: string) => {
    setScannedCode(code);
    stopCamera();
    
    // Check if it's an individual guest QR code (BG- prefix)
    if (code.startsWith('BG-')) {
      await lookupGuestByQR(code);
    } else if (code === bookingReference || code.includes(bookingReference)) {
      toast.success('QR code verified!');
    } else {
      // Try parsing as JSON (legacy format)
      try {
        const parsed = JSON.parse(code);
        if (parsed.ref === bookingReference) {
          toast.success('QR code verified!');
        } else {
          setScanError('QR code does not match this booking. Please verify.');
        }
      } catch {
        setScanError('QR code does not match this booking. Please verify.');
      }
    }
  };

  const lookupGuestByQR = async (qrCode: string) => {
    setIsLookingUp(true);
    try {
      const { data, error } = await supabase
        .from('booking_guests')
        .select(`
          id, guest_number, guest_name, qr_code, check_in_status, is_primary,
          profile:profiles!booking_guests_user_id_fkey(display_name, phone),
          booking:bookings(id, booking_reference, party_size, venue:venues(name))
        `)
        .eq('qr_code', qrCode)
        .single();

      if (error) throw error;

      setFoundGuest(data as unknown as GuestInfo);
      setFoundBooking(data.booking as unknown as BookingInfo);
      setMode('guest-found');
      playCheckInSound();
    } catch (error) {
      console.error('Error looking up guest:', error);
      setScanError('Guest not found with this QR code');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualRef.trim()) {
      toast.error('Please enter the booking reference');
      return;
    }
    
    // Check if it's a guest QR code
    if (manualRef.trim().startsWith('BG-')) {
      lookupGuestByQR(manualRef.trim());
      return;
    }
    
    if (manualRef.toUpperCase() !== bookingReference.toUpperCase()) {
      toast.error('Booking reference does not match');
      return;
    }
    
    toast.success('Reference verified!');
    setScannedCode(manualRef);
  };

  // Auto-create POS session when checking in
  const createPOSSession = async () => {
    if (!venueId || !bookingId) return null;
    
    try {
      // Check if session already exists for this booking
      const { data: existingSession } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('booking_id', bookingId)
        .in('status', ['open', 'billing'])
        .maybeSingle();

      if (existingSession) {
        console.log('POS session already exists for this booking');
        return existingSession;
      }

      // Create new session linked to booking
      const { data: sessionData, error } = await supabase
        .from('table_sessions')
        .insert({
          venue_id: venueId,
          booking_id: bookingId,
          table_id: tableId || null,
          guest_count: guestCount,
          guest_name: bookingGuestName || null,
          status: 'open'
        })
        .select('id, table_id, booking_id')
        .single();

      if (error) throw error;
      console.log('POS session created for booking:', bookingId, sessionData);
      return sessionData;
    } catch (error) {
      console.error('Error creating POS session:', error);
      // Don't block check-in if session creation fails
      return null;
    }
  };

  const handleConfirmCheckIn = async () => {
    const spend = parseFloat(spendAmount) || undefined;
    
    // Create POS session automatically
    const session = await createPOSSession();
    if (session) {
      toast.success(`POS session created: ${session.id}`);
    }
    
    onCheckIn('showed', spend, foundGuest?.id);
  };

  const handleGuestCheckIn = async () => {
    if (!foundGuest) return;

    const spend = parseFloat(spendAmount) || undefined;
    
    try {
      const { error } = await supabase
        .from('booking_guests')
        .update({
          check_in_status: 'checked_in',
          checked_in_at: new Date().toISOString(),
          spend_amount: spend || null,
        })
        .eq('id', foundGuest.id);

      if (error) throw error;

      playCheckInSound();
      toast.success(`${foundGuest.guest_name || `Guest ${foundGuest.guest_number}`} checked in!`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error checking in guest:', error);
      toast.error('Failed to check in guest');
    }
  };

  const handleGuestNoShow = async () => {
    if (!foundGuest) return;

    try {
      const { error } = await supabase
        .from('booking_guests')
        .update({
          check_in_status: 'no_show',
        })
        .eq('id', foundGuest.id);

      if (error) throw error;

      toast.success(`${foundGuest.guest_name || `Guest ${foundGuest.guest_number}`} marked as no-show`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking no-show:', error);
      toast.error('Failed to mark as no-show');
    }
  };

  const handleNoShow = () => {
    onCheckIn('no_show');
  };

  const renderChooseMode = () => (
    <div className="space-y-4 py-4">
      <div className="text-center mb-6">
        <p className="text-lg font-medium text-foreground">{venueName}</p>
        <p className="text-sm text-muted-foreground">Ref: {bookingReference}</p>
        <p className="text-sm text-muted-foreground">{guestCount} guests</p>
      </div>

      <Button
        onClick={() => {
          setMode('scan');
          startCamera();
        }}
        className="w-full h-16 bg-primary hover:bg-primary/90"
      >
        <QrCode className="w-6 h-6 mr-3" />
        <div className="text-left">
          <p className="font-medium">Scan Guest QR Code</p>
          <p className="text-xs opacity-80">Scan individual guest pass</p>
        </div>
      </Button>

      <Button
        onClick={() => setMode('manual')}
        variant="outline"
        className="w-full h-16"
      >
        <Keyboard className="w-6 h-6 mr-3" />
        <div className="text-left">
          <p className="font-medium">Manual Check-In</p>
          <p className="text-xs opacity-80">Enter guest QR or booking ref</p>
        </div>
      </Button>

      <div className="pt-4 border-t border-border">
        <Button
          onClick={handleNoShow}
          variant="ghost"
          disabled={isProcessing}
          className="w-full text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4 mr-2" />
          )}
          Mark All as No-Show
        </Button>
      </div>
    </div>
  );

  const renderScanMode = () => (
    <div className="space-y-4 py-4">
      <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
          </div>
        </div>

        {isScanning && !scannedCode && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
              <Camera className="w-4 h-4 inline mr-2" />
              Point at guest's QR code
            </p>
          </div>
        )}

        {isLookingUp && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>

      {scanError && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
          {scanError}
        </div>
      )}

      {scannedCode && !scanError && !foundGuest && (
        <>
          <div className="bg-green-500/10 text-green-500 rounded-lg p-3 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" />
            QR code verified: {scannedCode}
          </div>

          <div className="space-y-2">
            <Label>Spend Amount (Optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rp</span>
              <Input
                type="number"
                placeholder="0"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            stopCamera();
            setMode('choose');
          }}
          className="flex-1"
        >
          Back
        </Button>
        
        {scannedCode && !scanError && !foundGuest ? (
          <Button
            onClick={handleConfirmCheckIn}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Confirm Check-In
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setMode('manual')}
            className="flex-1"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Enter Manually
          </Button>
        )}
      </div>
    </div>
  );

  const renderManualMode = () => (
    <div className="space-y-4 py-4">
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">
          Enter guest QR code (BG-...) or booking ref
        </p>
      </div>

      <div className="space-y-2">
        <Label>Code or Reference</Label>
        <Input
          placeholder="BG-XXXXXXXX or NTL-ABC123"
          value={manualRef}
          onChange={(e) => setManualRef(e.target.value.toUpperCase())}
          className="font-mono text-lg tracking-wider"
          autoFocus
        />
      </div>

      {manualRef && !manualRef.startsWith('BG-') && manualRef.toUpperCase() === bookingReference.toUpperCase() && (
        <div className="bg-green-500/10 text-green-500 rounded-lg p-3 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Reference verified!
        </div>
      )}

      <div className="space-y-2">
        <Label>Spend Amount (Optional)</Label>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rp</span>
          <Input
            type="number"
            placeholder="0"
            value={spendAmount}
            onChange={(e) => setSpendAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => setMode('choose')}
          className="flex-1"
        >
          Back
        </Button>
        
        <Button
          onClick={handleManualSubmit}
          disabled={isProcessing || isLookingUp}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isProcessing || isLookingUp ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserCheck className="w-4 h-4 mr-2" />
              {manualRef.startsWith('BG-') ? 'Look Up Guest' : 'Check In'}
            </>
          )}
        </Button>
      </div>

      <Button
        variant="ghost"
        onClick={handleConfirmCheckIn}
        disabled={isProcessing}
        className="w-full text-muted-foreground hover:text-foreground"
      >
        Skip verification & check in anyway
      </Button>
    </div>
  );

  const renderGuestFoundMode = () => {
    if (!foundGuest || !foundBooking) return null;

    const guestName = foundGuest.profile?.display_name || foundGuest.guest_name || `Guest ${foundGuest.guest_number}`;
    const isAlreadyCheckedIn = foundGuest.check_in_status === 'checked_in';
    const isNoShow = foundGuest.check_in_status === 'no_show';

    return (
      <div className="space-y-4 py-4">
        {/* Guest Info Card */}
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{guestName}</p>
              <p className="text-sm text-muted-foreground">
                Guest {foundGuest.guest_number} of {foundBooking.party_size}
                {foundGuest.is_primary && ' • Host'}
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                isAlreadyCheckedIn
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : isNoShow
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }
            >
              {isAlreadyCheckedIn ? 'Checked In' : isNoShow ? 'No Show' : 'Pending'}
            </Badge>
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Venue</span>
              <span className="text-foreground">{foundBooking.venue?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Booking Ref</span>
              <span className="font-mono text-foreground">{foundBooking.booking_reference}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">QR Code</span>
              <span className="font-mono text-primary">{foundGuest.qr_code}</span>
            </div>
          </div>
        </div>

        {!isAlreadyCheckedIn && !isNoShow && (
          <div className="space-y-2">
            <Label>Spend Amount (Optional)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rp</span>
              <Input
                type="number"
                placeholder="0"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              setMode('choose');
              setFoundGuest(null);
              setFoundBooking(null);
            }}
            className="flex-1"
          >
            Back
          </Button>

          {!isAlreadyCheckedIn && !isNoShow && (
            <>
              <Button
                variant="outline"
                onClick={handleGuestNoShow}
                disabled={isProcessing}
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleGuestCheckIn}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </>
          )}

          {(isAlreadyCheckedIn || isNoShow) && (
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Done
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-green-500" />
            Guest Check-In
          </DialogTitle>
          <DialogDescription>
            {mode === 'choose' && 'Choose a check-in method'}
            {mode === 'scan' && "Scan the guest's individual QR code"}
            {mode === 'manual' && 'Enter guest QR code or booking reference'}
            {mode === 'guest-found' && 'Guest found - confirm check-in'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'choose' && renderChooseMode()}
        {mode === 'scan' && renderScanMode()}
        {mode === 'manual' && renderManualMode()}
        {mode === 'guest-found' && renderGuestFoundMode()}
      </DialogContent>
    </Dialog>
  );
}
