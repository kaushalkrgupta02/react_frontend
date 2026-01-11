import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Search, X, Loader2, AlertCircle, Settings } from 'lucide-react';
import { playSuccessSound, playErrorSound } from '@/lib/audioFeedback';
import { toast } from 'sonner';
import { requestCameraPermission, getPermissionInstructions } from '@/lib/permissions';
import type { ScannerMode, QRCodeData } from '@/types/venue-mode';

interface PassScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string | null;
  onPassScanned: (passId: string) => void;
}

const PassScanner = forwardRef<HTMLDivElement, PassScannerProps>(function PassScanner({
  open,
  onOpenChange,
  venueId,
  onPassScanned,
}, ref) {
  const [mode, setMode] = useState<ScannerMode>('choose');
  const [manualSearch, setManualSearch] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    isScanningRef.current = false;
    setIsScanning(false);
    setCameraError(null);
  }, []);

  const handleScannedCode = useCallback((code: string) => {
    stopCamera();
    try {
      // Try to parse as JSON (our QR format)
      const parsed = JSON.parse(code) as Partial<QRCodeData>;
      if (parsed.passId) {
        // Verify venue matches
        if (venueId && parsed.venueId && parsed.venueId !== venueId) {
          playErrorSound();
          toast.error('This pass is for a different venue');
          setMode('choose');
          return;
        }
        playSuccessSound();
        onPassScanned(parsed.passId);
        onOpenChange(false);
        return;
      }
    } catch {
      // Not JSON, treat as pass ID
    }

    // Treat raw string as pass ID (UUID format)
    if (code.length >= 32) {
      playSuccessSound();
      onPassScanned(code);
      onOpenChange(false);
    } else {
      playErrorSound();
      toast.error('Invalid QR code format');
      setMode('choose');
    }
  }, [stopCamera, venueId, onPassScanned, onOpenChange]);

  const scanForQRCode = useCallback(() => {
    if (!videoRef.current || !isScanningRef.current) return;

    const video = videoRef.current;
    
    if ('BarcodeDetector' in window) {
      // @ts-ignore - BarcodeDetector is not in TS types yet
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      
      const detect = async () => {
        if (!isScanningRef.current || !video.videoWidth) {
          if (isScanningRef.current) {
            animationRef.current = requestAnimationFrame(detect);
          }
          return;
        }

        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            handleScannedCode(code);
            return;
          }
        } catch {
          // Continue scanning
        }
        
        if (isScanningRef.current) {
          animationRef.current = requestAnimationFrame(detect);
        }
      };

      animationRef.current = requestAnimationFrame(detect);
    } else {
      setCameraError('QR scanning is not supported on this device');
      setMode('manual');
    }
  }, [handleScannedCode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    
    // First, request permission with user-friendly error handling
    const permissionResult = await requestCameraPermission();
    
    if (!permissionResult.granted) {
      setCameraError(permissionResult.error || 'Unable to access camera');
      
      if (permissionResult.state === 'denied') {
        const instructions = getPermissionInstructions('camera');
        toast.error(
          <div className="space-y-2">
            <p className="font-medium">Camera Access Denied</p>
            <p className="text-xs whitespace-pre-line">{instructions}</p>
            <p className="text-xs">Then refresh the page and try again.</p>
          </div>,
          { duration: 8000 }
        );
      } else if (permissionResult.state === 'unsupported') {
        toast.error(permissionResult.error || 'Camera not supported');
      } else {
        toast.error('Unable to access camera');
      }
      setMode('manual');
      return;
    }
    
    // Permission granted, now start the camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        isScanningRef.current = true;
        setIsScanning(true);
        scanForQRCode();
      }
    } catch (error) {
      console.error('Camera start error:', error);
      setCameraError('Unable to start camera');
      toast.error('Camera failed to start. Please try again.');
      setMode('manual');
    }
  }, [scanForQRCode]);

  const handleManualSearch = useCallback(() => {
    const searchTerm = manualSearch.trim();
    if (!searchTerm) return;
    
    setIsSearching(true);
    // Use a small delay for UX feedback
    setTimeout(() => {
      onPassScanned(searchTerm);
      setIsSearching(false);
      onOpenChange(false);
    }, 300);
  }, [manualSearch, onPassScanned, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  }, [handleManualSearch]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setMode('choose');
      setManualSearch('');
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [open, stopCamera]);

  // Start/stop camera when mode changes
  useEffect(() => {
    if (mode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [mode, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Pass</DialogTitle>
          <DialogDescription>
            Scan the QR code on the customer's pass or search manually
          </DialogDescription>
        </DialogHeader>

        {mode === 'choose' && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col gap-2"
              onClick={() => setMode('scan')}
            >
              <Camera className="w-6 h-6" />
              <span>Scan QR Code</span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col gap-2"
              onClick={() => setMode('manual')}
            >
              <Search className="w-6 h-6" />
              <span>Manual Search</span>
            </Button>
          </div>
        )}

        {mode === 'scan' && (
          <div className="space-y-4">
            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse" />
              </div>
              {!isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
                  <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                  <p className="text-center text-sm text-white">{cameraError}</p>
                </div>
              )}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Point camera at the QR code on the customer's pass
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMode('choose')}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="Enter pass ID..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the pass ID shown on the customer's screen
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMode('choose')}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleManualSearch}
                disabled={!manualSearch.trim() || isSearching}
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

export default PassScanner;
