import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Search, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import jsQR from 'jsqr';

type Mode = 'idle' | 'scan' | 'manual';

interface InlineScanSearchProps {
  placeholder: string;
  scanLabel?: string;
  searchLabel?: string;
  onSearch: (value: string) => void | Promise<void>;
  isSearching?: boolean;
  venueId?: string | null;
}

export default function InlineScanSearch({
  placeholder,
  scanLabel = 'Scan QR',
  searchLabel = 'Search',
  onSearch,
  isSearching = false,
  venueId,
}: InlineScanSearchProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [searchValue, setSearchValue] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
    setMode('idle');
    
    try {
      // Try to parse as JSON (our QR format)
      const parsed = JSON.parse(code);
      if (parsed.passId) {
        // Verify venue matches
        if (venueId && parsed.venueId && parsed.venueId !== venueId) {
          toast.error('This code is for a different venue');
          return;
        }
        onSearch(parsed.passId);
        return;
      }
      if (parsed.purchaseId) {
        onSearch(parsed.purchaseId);
        return;
      }
      if (parsed.promoCode) {
        onSearch(parsed.promoCode);
        return;
      }
    } catch {
      // Not JSON, treat as raw ID/code
    }

    // Treat raw string as ID
    onSearch(code);
  }, [stopCamera, venueId, onSearch]);

  const scanForQRCode = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    const detect = () => {
      if (!isScanningRef.current || !video.videoWidth) {
        if (isScanningRef.current) {
          animationRef.current = requestAnimationFrame(detect);
        }
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        handleScannedCode(code.data);
        return;
      }
      
      if (isScanningRef.current) {
        animationRef.current = requestAnimationFrame(detect);
      }
    };

    animationRef.current = requestAnimationFrame(detect);
  }, [handleScannedCode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
      console.error('Camera access error:', error);
      setCameraError('Unable to access camera');
      toast.error('Camera access denied. Please use manual entry.');
    }
  }, [scanForQRCode]);

  const handleManualSearch = useCallback(() => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    onSearch(trimmed);
    setSearchValue('');
  }, [searchValue, onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  }, [handleManualSearch]);

  // Start camera when mode changes to scan
  useEffect(() => {
    if (mode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [mode, startCamera, stopCamera]);

  return (
    <div className="space-y-4">
      {/* Toggle Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode(mode === 'scan' ? 'idle' : 'scan')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
            mode === 'scan'
              ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
              : 'bg-violet-600/80 text-white hover:bg-violet-600'
          }`}
        >
          <Camera className={`w-4 h-4 transition-transform ${mode === 'scan' ? 'animate-pulse' : ''}`} />
          <span>{scanLabel}</span>
        </button>
        <button
          onClick={() => setMode(mode === 'manual' ? 'idle' : 'manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full text-sm font-medium transition-all active:scale-95 ${
            mode === 'manual'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
              : 'bg-emerald-600/80 text-white hover:bg-emerald-600'
          }`}
        >
          <Search className={`w-4 h-4 transition-transform ${mode === 'manual' ? 'animate-pulse' : ''}`} />
          <span>{searchLabel}</span>
        </button>
      </div>


      {mode === 'scan' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-2 border-violet-500 rounded-lg animate-pulse" />
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
          <p className="text-center text-xs text-muted-foreground">
            Point camera at QR code
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setMode('idle')}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={placeholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-mono"
            />
            <Button
              onClick={handleManualSearch}
              disabled={!searchValue.trim() || isSearching}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Enter the code shown on customer's screen
          </p>
        </div>
      )}
    </div>
  );
}
