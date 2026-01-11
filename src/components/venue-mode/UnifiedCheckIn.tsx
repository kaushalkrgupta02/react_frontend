import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { 
  Camera, 
  Search, 
  X, 
  Loader2, 
  AlertCircle, 
  QrCode,
  CalendarCheck,
  Ticket,
  Package,
  CheckCircle2,
  User,
  Clock,
  Crown,
  Gift,
  UserCheck,
  ChevronRight,
  Check,
  UserPlus,
  Users,
  Phone,
  Mail,
  MapPin,
  Plus,
  Cigarette,
  Settings
} from 'lucide-react';
import { useGuestProfiles, GuestProfile } from '@/hooks/useGuestProfiles';
import { useVenueTables } from '@/hooks/useVenueTables';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { playSuccessSound, playErrorSound, playCheckInSound } from '@/lib/audioFeedback';
import { formatPrice } from '@/types/venue-mode';
import { usePackagePurchases, PackagePurchaseWithItems } from '@/hooks/usePackagePurchases';
import { usePackageRedemptions } from '@/hooks/usePackageRedemptions';
import { useAuth } from '@/hooks/useAuth';
import { requestCameraPermission, getPermissionInstructions } from '@/lib/permissions';

type Mode = 'idle' | 'scan' | 'manual' | 'walkin';
type DetectedType = 'booking' | 'pass' | 'package' | 'walkin' | null;

interface UnifiedCheckInProps {
  venueId: string | null;
}

interface BookingResult {
  id: string;
  booking_reference: string;
  booking_date: string;
  party_size: number;
  status: string;
  start_time?: string;
  resource_name?: string;
  special_requests?: string;
  profile?: { display_name?: string; phone?: string };
  venue?: { name: string };
}

interface PassResult {
  id: string;
  pass_type: string;
  status: string;
  price: number;
  purchase_date: string;
  free_item_claimed: boolean;
  profile?: { display_name?: string; phone?: string };
  venue?: { name: string; vip_pass_free_item?: string };
}

export default function UnifiedCheckIn({ venueId }: UnifiedCheckInProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('idle');
  const [searchValue, setSearchValue] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Detection results
  const [detectedType, setDetectedType] = useState<DetectedType>(null);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [pass, setPass] = useState<PassResult | null>(null);
  const [packagePurchase, setPackagePurchase] = useState<PackagePurchaseWithItems | null>(null);
  
  // Pass-specific
  const [claimFreeItem, setClaimFreeItem] = useState(false);
  
  // Package-specific
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());

  // Created session indicator (for debug/visual confirmation)
  interface CreatedSessionInfo {
    id: string;
    booking_id?: string | null;
    table_id?: string | null;
    table_number?: string | null;
    guest_count?: number | null;
  }
  const [createdSession, setCreatedSession] = useState<CreatedSessionInfo | null>(null);

  // Walk-in form
  const [walkInForm, setWalkInForm] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    partySize: '2',
    notes: '',
    tableId: '',
    smokingPreference: 'non-smoking' as 'smoking' | 'non-smoking',
  });

  // Walk-in guest search
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isNewGuest, setIsNewGuest] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isScanningRef = useRef(false);

  const { findPurchaseByQRCode } = usePackagePurchases(venueId);
  const { redeemMultipleItems, isRedeeming } = usePackageRedemptions();
  const { guests, isLoading: guestsLoading } = useGuestProfiles(venueId);
  const { tables, isLoading: tablesLoading } = useVenueTables(venueId);

  // Filter available tables
  const availableTables = useMemo(() => 
    tables.filter(t => t.is_active && t.status === 'available'),
    [tables]
  );

  // Filter guests based on search query
  const filteredGuests = useMemo(() => {
    if (!guestSearchQuery.trim()) return [];
    const query = guestSearchQuery.toLowerCase();
    return guests.filter(g => 
      g.guest_name?.toLowerCase().includes(query) ||
      g.guest_phone?.includes(query) ||
      g.guest_email?.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [guests, guestSearchQuery]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isScanningRef.current = false;
    setIsScanning(false);
    setCameraError(null);
  }, []);

  const resetResults = useCallback(() => {
    setDetectedType(null);
    setBooking(null);
    setPass(null);
    setPackagePurchase(null);
    setClaimFreeItem(false);
    setSelectedItems(new Map());
    setWalkInForm({ guestName: '', guestPhone: '', guestEmail: '', partySize: '2', notes: '', tableId: '', smokingPreference: 'non-smoking' });
    setGuestSearchQuery('');
    setSelectedGuestId(null);
    setIsNewGuest(true);
  }, []);

  // Handle selecting existing guest
  const handleSelectGuest = (guest: GuestProfile) => {
    setSelectedGuestId(guest.id);
    setIsNewGuest(false);
    setWalkInForm(prev => ({
      ...prev,
      guestName: guest.guest_name || '',
      guestPhone: guest.guest_phone || '',
      guestEmail: guest.guest_email || '',
    }));
    setGuestSearchQuery('');
  };

  // Handle creating new guest - detect if input is name, phone, or email
  const handleNewGuest = () => {
    setSelectedGuestId(null);
    setIsNewGuest(true);
    
    const query = guestSearchQuery.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
    const isPhone = /^[\d\s\-+()]{6,}$/.test(query);
    
    setWalkInForm(prev => ({
      ...prev,
      guestName: !isEmail && !isPhone ? query : '',
      guestPhone: isPhone ? query : '',
      guestEmail: isEmail ? query : '',
    }));
    setGuestSearchQuery('');
  };

  const detectAndFetch = useCallback(async (code: string) => {
    if (!code.trim() || !venueId) return;

    setIsSearching(true);
    resetResults();

    try {
      // Try to parse as JSON (our QR format)
      let searchCode = code;
      let typeHint: string | null = null;

      try {
        const parsed = JSON.parse(code);
        if (parsed.passId) {
          searchCode = parsed.passId;
          typeHint = 'pass';
        } else if (parsed.purchaseId) {
          searchCode = parsed.purchaseId;
          typeHint = 'package';
        } else if (parsed.bookingRef) {
          searchCode = parsed.bookingRef;
          typeHint = 'booking';
        }
      } catch {
        // Not JSON, use raw code
      }

      // Check for booking reference pattern (NTL-XXXXXX)
      if (typeHint === 'booking' || searchCode.match(/^NTL-[A-Z0-9]{6}$/i)) {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select(`
            id, booking_reference, booking_date, party_size, status, 
            start_time, resource_name, special_requests,
            venues (name)
          `)
          .eq('booking_reference', searchCode.toUpperCase())
          .eq('venue_id', venueId)
          .single();

        if (bookingData) {
          setDetectedType('booking');
          setBooking({
            ...bookingData,
            venue: bookingData.venues as any,
          });
          setIsSearching(false);
          return;
        }
      }

      // Check for package code pattern (PKG-XXXXXXXX)
      if (typeHint === 'package' || searchCode.match(/^PKG-[A-Z0-9]{8}$/i)) {
        const result = await findPurchaseByQRCode(searchCode);
        if (result.success && result.data) {
          setDetectedType('package');
          setPackagePurchase(result.data);
          setIsSearching(false);
          return;
        }
      }

      // Check for pass (UUID format)
      if (typeHint === 'pass' || searchCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: passData } = await supabase
          .from('line_skip_passes')
          .select(`
            id, pass_type, status, price, purchase_date, free_item_claimed,
            venues (name, vip_pass_free_item)
          `)
          .eq('id', searchCode)
          .eq('venue_id', venueId)
          .single();

        if (passData) {
          setDetectedType('pass');
          setPass({
            ...passData,
            venue: passData.venues as any,
          });
          setIsSearching(false);
          return;
        }
      }

      // General search: try all types
      // 1. Try booking by reference
      const { data: bookingData } = await supabase
        .from('bookings')
        .select(`
          id, booking_reference, booking_date, party_size, status, 
          start_time, resource_name, special_requests,
          venues (name)
        `)
        .eq('venue_id', venueId)
        .or(`booking_reference.ilike.%${searchCode}%,id.eq.${searchCode}`)
        .limit(1)
        .maybeSingle();

      if (bookingData) {
        setDetectedType('booking');
        setBooking({
          ...bookingData,
          venue: bookingData.venues as any,
        });
        setIsSearching(false);
        return;
      }

      // 2. Try package
      const packageResult = await findPurchaseByQRCode(searchCode);
      if (packageResult.success && packageResult.data) {
        setDetectedType('package');
        setPackagePurchase(packageResult.data);
        setIsSearching(false);
        return;
      }

      // 3. Try pass
      const { data: passData } = await supabase
        .from('line_skip_passes')
        .select(`
          id, pass_type, status, price, purchase_date, free_item_claimed,
          venues (name, vip_pass_free_item)
        `)
        .eq('venue_id', venueId)
        .eq('id', searchCode)
        .maybeSingle();

      if (passData) {
        setDetectedType('pass');
        setPass({
          ...passData,
          venue: passData.venues as any,
        });
        setIsSearching(false);
        return;
      }

      toast.error('No booking, pass, or package found with this code');
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Error searching for code');
    } finally {
      setIsSearching(false);
    }
  }, [venueId, findPurchaseByQRCode, resetResults]);

  const handleScannedCode = useCallback((code: string) => {
    stopCamera();
    setMode('idle');
    detectAndFetch(code);
  }, [stopCamera, detectAndFetch]);

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
    setIsScanning(false);
    
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Request camera with a timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera request timed out')), 10000)
      );

      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
      });

      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      
      if (!stream || !stream.active) {
        throw new Error('Camera stream is not active');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video load timeout')), 5000);
          
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              clearTimeout(timeout);
              resolve(null);
            };
            videoRef.current.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Video load error'));
            };
          } else {
            clearTimeout(timeout);
            reject(new Error('Video element not found'));
          }
        });

        await videoRef.current.play();
        isScanningRef.current = true;
        setIsScanning(true);
        scanForQRCode();
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const errorName = error?.name || '';
      const errorMessage = error?.message || '';
      
      if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        const instructions = getPermissionInstructions('camera');
        setCameraError('Camera permission denied');
        toast.error(
          <div className="space-y-2">
            <p className="font-medium">Camera Access Denied</p>
            <p className="text-xs whitespace-pre-line">{instructions}</p>
          </div>,
          { duration: 8000 }
        );
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setCameraError('No camera found');
        toast.error('No camera found on this device');
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setCameraError('Camera is busy');
        toast.error('Camera is already in use by another app');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        setCameraError('Camera timeout');
        toast.error('Camera took too long to start. Please try again.');
      } else {
        setCameraError('Unable to start camera');
        toast.error('Camera failed to start. Please try manual entry.');
      }
      
      setMode('manual');
    }
  }, [scanForQRCode]);

  const handleManualSearch = useCallback(() => {
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    detectAndFetch(trimmed);
    setSearchValue('');
    setMode('idle');
  }, [searchValue, detectAndFetch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  }, [handleManualSearch]);

  // Booking check-in
  const handleBookingCheckIn = async () => {
    if (!booking) return;
    
    setIsProcessing(true);
    try {
      // Update booking status to confirmed
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id);

      if (error) throw error;

      // Record outcome
      await supabase.from('booking_outcomes').insert({
        booking_id: booking.id,
        venue_id: venueId,
        outcome: 'showed',
        arrived_at: new Date().toISOString(),
      });

      // Create POS session for this booking (if not exists) and mark table occupied when possible
      try {
        // Check if session already exists for this booking
        const { data: existingSession } = await supabase
          .from('table_sessions')
          .select('id')
          .eq('booking_id', booking.id)
          .in('status', ['open', 'billing'])
          .maybeSingle();

        if (!existingSession) {
          // Try to map booking.resource_name to a table by table_number
          const matchedTable = booking.resource_name && tables ? tables.find(t => t.table_number === booking.resource_name) : null;

          const { data: sessionData, error: sessionError } = await supabase.from('table_sessions')
            .insert({
              venue_id: venueId,
              booking_id: booking.id,
              table_id: matchedTable?.id || null,
              guest_count: booking.party_size,
              guest_name: booking.profile?.display_name || null,
              status: 'open'
            })
            .select('id, table_id, booking_id')
            .single();

          if (sessionError) {
            console.warn('Failed to create POS session for booking:', sessionError);
          } else {
            console.log('Auto-created POS session for booking:', sessionData);
            setCreatedSession({
              id: sessionData.id,
              booking_id: sessionData.booking_id,
              table_id: sessionData.table_id || null,
              table_number: matchedTable?.table_number || null,
              guest_count: booking.party_size
            });

            if (matchedTable) {
              // Mark table as occupied
              const { error: tableError } = await supabase
                .from('venue_tables')
                .update({ status: 'occupied' })
                .eq('id', matchedTable.id);

              if (tableError) console.warn('Failed to mark table as occupied:', tableError);
              else console.log('Marked table as occupied:', matchedTable.table_number);
            }
          }
        }
      } catch (e) {
        console.warn('Non-fatal: failed to auto-create session/update table status for booking', e);
      }

      playSuccessSound();
      toast.success('Guest checked in successfully!');
      resetResults();
    } catch (error) {
      console.error('Check-in error:', error);
      playErrorSound();
      toast.error('Failed to check in guest');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pass redemption
  const handlePassRedeem = async () => {
    if (!pass) return;
    
    setIsProcessing(true);
    try {
      const updates: any = { status: 'used' };
      if (pass.pass_type === 'vip' && claimFreeItem) {
        updates.free_item_claimed = true;
      }

      const { error } = await supabase
        .from('line_skip_passes')
        .update(updates)
        .eq('id', pass.id);

      if (error) throw error;

      playSuccessSound();
      toast.success('Pass redeemed successfully!');
      resetResults();
    } catch (error) {
      console.error('Redeem error:', error);
      playErrorSound();
      toast.error('Failed to redeem pass');
    } finally {
      setIsProcessing(false);
    }
  };

  // Package item selection
  const handleSelectItem = (itemId: string, maxQuantity: number, redeemedCount: number) => {
    const remaining = maxQuantity - redeemedCount;
    if (remaining <= 0) return;

    const current = selectedItems.get(itemId) || 0;
    const newMap = new Map(selectedItems);
    
    if (current > 0) {
      if (current < remaining) {
        newMap.set(itemId, current + 1);
      } else {
        newMap.delete(itemId);
      }
    } else {
      newMap.set(itemId, 1);
    }
    
    setSelectedItems(newMap);
  };

  // Package redemption
  const handlePackageRedeem = async () => {
    if (!packagePurchase || selectedItems.size === 0) return;

    const items = Array.from(selectedItems.entries()).map(([itemId, qty]) => ({
      packageItemId: itemId,
      quantity: qty,
    }));

    const result = await redeemMultipleItems(packagePurchase.id, items);

    if (result.success) {
      playCheckInSound();
      toast.success('Items redeemed successfully!');
      resetResults();
    } else {
      toast.error(result.error || 'Failed to redeem items');
    }
  };

  // Walk-in check-in - creates a POS session directly
  const handleWalkInCheckIn = async () => {
    if (!venueId) return;
    
    const { guestName, guestPhone, partySize, notes, tableId } = walkInForm;
    
    if (!guestName.trim()) {
      toast.error('Please enter guest name');
      return;
    }

    setIsProcessing(true);
    try {
      // Handle guest profile
      let guestProfileId: string | null = selectedGuestId;
      
      if (isNewGuest && (guestPhone || walkInForm.guestEmail || guestName.trim())) {
        // Check for existing guest
        const { data: existingGuest } = await supabase
          .from('venue_guest_profiles')
          .select('id')
          .eq('venue_id', venueId)
          .or(`guest_phone.eq.${guestPhone},guest_email.eq.${walkInForm.guestEmail}`)
          .maybeSingle();

        if (existingGuest) {
          guestProfileId = existingGuest.id;
          // Update visit count
          const { data: currentData } = await supabase
            .from('venue_guest_profiles')
            .select('total_visits')
            .eq('id', guestProfileId)
            .single();
          
          await supabase
            .from('venue_guest_profiles')
            .update({ 
              total_visits: (currentData?.total_visits || 0) + 1,
              last_visit_at: new Date().toISOString()
            })
            .eq('id', guestProfileId);
        } else {
          const { data: newGuest } = await supabase
            .from('venue_guest_profiles')
            .insert({
              venue_id: venueId,
              guest_name: guestName.trim(),
              guest_phone: guestPhone || null,
              guest_email: walkInForm.guestEmail || null,
              total_visits: 1,
              last_visit_at: new Date().toISOString(),
              tags: ['walk-in'],
            })
            .select('id')
            .single();
          
          guestProfileId = newGuest?.id || null;
        }
      } else if (!isNewGuest && selectedGuestId) {
        // Update existing guest visit count
        const { data: currentData } = await supabase
          .from('venue_guest_profiles')
          .select('total_visits')
          .eq('id', selectedGuestId)
          .single();
        
        await supabase
          .from('venue_guest_profiles')
          .update({ 
            total_visits: (currentData?.total_visits || 0) + 1,
            last_visit_at: new Date().toISOString()
          })
          .eq('id', selectedGuestId);
      }

      // Create a POS table session directly for walk-ins (no booking needed)
      const { data: newSession, error: sessionError } = await supabase.from('table_sessions')
        .insert({
          venue_id: venueId,
          table_id: tableId || null,
          guest_count: parseInt(partySize) || 2,
          guest_name: guestName.trim(),
          notes: notes || null,
          status: 'open',
        })
        .select('id, table_id')
        .single();

      if (sessionError) throw sessionError;

      // Mark table as occupied if assigned
      if (tableId) {
        const { error: tableError } = await supabase
          .from('venue_tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
        if (tableError) console.warn('Failed to mark table as occupied:', tableError);
        else console.log('Marked table as occupied for walk-in:', tableId);
      }

      console.log('Created walk-in POS session:', newSession);
      setCreatedSession({
        id: newSession.id,
        table_id: newSession.table_id || null,
        table_number: tableId ? (tables.find(t => t.id === tableId)?.table_number || null) : null,
        guest_count: parseInt(partySize) || 2,
      });

      playSuccessSound();
      const selectedTable = tableId ? tables.find(t => t.id === tableId) : null;
      const tableMsg = selectedTable?.table_number ? ` → ${selectedTable.table_number}` : '';
      toast.success(`Walk-in checked in: ${guestName} (${partySize} guests)${tableMsg}`);
      resetResults();
      setMode('idle');
    } catch (error) {
      console.error('Walk-in error:', error);
      playErrorSound();
      toast.error('Failed to check in walk-in guest');
    } finally {
      setIsProcessing(false);
    }
  };

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

  // If we have a result, show the check-in UI
  if (detectedType && (booking || pass || packagePurchase)) {
    return (
      <div className="p-4 space-y-4">
        {/* Created session indicator */}
        {createdSession && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm">Session created</CardTitle>
                  <CardDescription className="text-xs">ID: {createdSession.id} {createdSession.table_number ? `• Table ${createdSession.table_number}` : ''}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setCreatedSession(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={resetResults}>
          <X className="w-4 h-4 mr-1" />
          Back to Scanner
        </Button>

        {/* Booking Check-in */}
        {detectedType === 'booking' && booking && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Table Booking</CardTitle>
                  <CardDescription>{booking.booking_reference}</CardDescription>
                </div>
                <Badge variant={booking.status === 'pending' ? 'secondary' : 'default'}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium">{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Time</span>
                  <p className="font-medium">{booking.start_time || 'Any time'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Party Size</span>
                  <p className="font-medium">{booking.party_size} guests</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Table</span>
                  <p className="font-medium">{booking.resource_name || 'Any'}</p>
                </div>
              </div>
              {booking.special_requests && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="text-foreground">{booking.special_requests}</p>
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={handleBookingCheckIn}
                disabled={isProcessing || booking.status === 'confirmed'}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserCheck className="w-4 h-4 mr-2" />
                )}
                {booking.status === 'confirmed' ? 'Already Checked In' : 'Check In Guest'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pass Check-in */}
        {detectedType === 'pass' && pass && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  pass.pass_type === 'vip' ? 'bg-yellow-500/20' : 'bg-primary/20'
                }`}>
                  {pass.pass_type === 'vip' ? (
                    <Crown className="w-6 h-6 text-yellow-500" />
                  ) : (
                    <Ticket className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {pass.pass_type === 'vip' ? 'VIP Pass' : 'Entry Pass'}
                  </CardTitle>
                  <CardDescription>{pass.venue?.name}</CardDescription>
                </div>
                <Badge variant={pass.status === 'active' ? 'default' : 'secondary'}>
                  {pass.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Purchase Date</span>
                  <p className="font-medium">{format(parseISO(pass.purchase_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price</span>
                  <p className="font-medium">{formatPrice(pass.price)}</p>
                </div>
              </div>

              {/* VIP Free Item */}
              {pass.pass_type === 'vip' && (
                <div className={`p-3 rounded-lg border ${
                  pass.free_item_claimed ? 'bg-muted' : 'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <Gift className={pass.free_item_claimed ? 'w-4 h-4 text-muted-foreground' : 'w-4 h-4 text-yellow-500'} />
                    <span className={pass.free_item_claimed ? 'text-muted-foreground line-through' : 'text-yellow-500 font-medium'}>
                      {pass.venue?.vip_pass_free_item || 'Free drink'}
                    </span>
                    {pass.free_item_claimed && <Badge variant="secondary" className="ml-auto text-xs">Claimed</Badge>}
                  </div>
                  {pass.status === 'active' && !pass.free_item_claimed && (
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox
                        id="claim-free"
                        checked={claimFreeItem}
                        onCheckedChange={(checked) => setClaimFreeItem(checked === true)}
                      />
                      <label htmlFor="claim-free" className="text-sm cursor-pointer">
                        Mark as claimed
                      </label>
                    </div>
                  )}
                </div>
              )}

              <Button 
                className="w-full" 
                onClick={handlePassRedeem}
                disabled={isProcessing || pass.status !== 'active'}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {pass.status === 'active' ? 'Redeem Pass' : 'Already Used'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Package Check-in */}
        {detectedType === 'package' && packagePurchase && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{packagePurchase.package?.name}</CardTitle>
                  <CardDescription>{packagePurchase.qr_code}</CardDescription>
                </div>
                <Badge variant={packagePurchase.status === 'active' ? 'default' : 'secondary'}>
                  {packagePurchase.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{packagePurchase.guest_name || 'Guest'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(packagePurchase.purchased_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b">
                  <p className="text-sm font-medium">Package Items</p>
                  <p className="text-xs text-muted-foreground">Tap to select for redemption</p>
                </div>
                <div className="divide-y">
                  {packagePurchase.items.map((item) => {
                    const remaining = item.quantity - item.redeemed_count;
                    const isRedeemed = remaining <= 0 && item.redemption_rule !== 'unlimited';
                    const selectedQty = selectedItems.get(item.id) || 0;
                    const isSelected = selectedQty > 0;
                    const canSelect = ['active', 'partially_redeemed'].includes(packagePurchase.status) && !isRedeemed;

                    return (
                      <button
                        key={item.id}
                        onClick={() => canSelect && handleSelectItem(item.id, item.quantity, item.redeemed_count)}
                        disabled={!canSelect}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          isSelected ? 'bg-primary/10' : canSelect ? 'hover:bg-muted/50' : 'opacity-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isRedeemed ? 'bg-green-500/20 text-green-400' 
                            : isSelected ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isRedeemed ? <Check className="w-4 h-4" /> 
                            : isSelected ? <span className="text-sm font-bold">{selectedQty}</span>
                            : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${isRedeemed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.item_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.redemption_rule === 'unlimited' ? 'Unlimited' : `${item.redeemed_count}/${item.quantity}`}
                          </p>
                        </div>
                        {canSelect && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedItems.size > 0 && (
                <Button 
                  className="w-full" 
                  onClick={handlePackageRedeem}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Redeem {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Scanner UI
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Check In</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scan or enter any booking, pass, or package code
        </p>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setMode(mode === 'scan' ? 'idle' : 'scan')}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-colors active:scale-95 ${
            mode === 'scan'
              ? 'bg-primary text-primary-foreground shadow-lg'
              : 'bg-primary/80 text-primary-foreground hover:bg-primary'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Scan QR</span>
        </button>
        <button
          onClick={() => setMode(mode === 'manual' ? 'idle' : 'manual')}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-colors active:scale-95 ${
            mode === 'manual'
              ? 'bg-secondary text-secondary-foreground shadow-lg border-2 border-primary'
              : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Manual</span>
        </button>
        <button
          onClick={() => setMode(mode === 'walkin' ? 'idle' : 'walkin')}
          className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-colors active:scale-95 ${
            mode === 'walkin'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-emerald-600/80 text-white hover:bg-emerald-600'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span>Walk-In</span>
        </button>
      </div>

      {/* Camera View */}
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
              <div className="w-40 h-40 border-2 border-primary rounded-lg animate-pulse" />
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
          <Button variant="outline" size="sm" className="w-full" onClick={() => setMode('idle')}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}

      {/* Manual Entry */}
      {mode === 'manual' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter code (e.g., NTL-ABC123, PKG-...)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              autoFocus
              className="font-mono"
            />
            <Button onClick={handleManualSearch} disabled={!searchValue.trim() || isSearching}>
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Enter booking reference, pass ID, or package code
          </p>
        </div>
      )}

      {/* Walk-In Form */}
      {mode === 'walkin' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <CardTitle className="text-base">Walk-In Guest</CardTitle>
                <CardDescription>Search existing or register new guest</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Guest Search / Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                Find or Add Guest *
              </Label>
              
              {/* Selected Guest Display */}
              {selectedGuestId && !isNewGuest ? (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{walkInForm.guestName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {walkInForm.guestPhone || walkInForm.guestEmail || 'Existing guest'}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedGuestId(null);
                      setIsNewGuest(true);
                      setWalkInForm(prev => ({ ...prev, guestName: '', guestPhone: '', guestEmail: '' }));
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : isNewGuest && walkInForm.guestName && !guestSearchQuery ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={walkInForm.guestName}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, guestName: e.target.value }))}
                        placeholder="Guest name"
                        className="h-8 text-sm font-medium bg-transparent border-0 p-0 focus-visible:ring-0"
                      />
                      <p className="text-xs text-muted-foreground">New guest</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setWalkInForm(prev => ({ ...prev, guestName: '', guestPhone: '', guestEmail: '' }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={guestSearchQuery}
                    onChange={(e) => setGuestSearchQuery(e.target.value)}
                    autoFocus
                  />
                  
                  {/* Search Results */}
                  {guestSearchQuery && (
                    <div className="border rounded-lg overflow-hidden">
                      {guestsLoading ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          {filteredGuests.map((guest) => (
                            <button
                              key={guest.id}
                              onClick={() => handleSelectGuest(guest)}
                              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 border-b last:border-b-0 transition-colors"
                            >
                              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{guest.guest_name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {guest.guest_phone || guest.guest_email || `${guest.total_visits} visits`}
                                </p>
                              </div>
                              {guest.vip_status === 'vip' && (
                                <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-500">VIP</Badge>
                              )}
                            </button>
                          ))}
                          
                          {/* Create New Guest Option */}
                          <button
                            onClick={handleNewGuest}
                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-primary/10 transition-colors bg-muted/30"
                          >
                            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                              <Plus className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm text-primary">Create new guest</p>
                              <p className="text-xs text-muted-foreground">"{guestSearchQuery}"</p>
                            </div>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Show additional fields when guest is selected */}
            {(walkInForm.guestName || selectedGuestId) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="partySize" className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      Party Size
                    </Label>
                    <Select 
                      value={walkInForm.partySize} 
                      onValueChange={(v) => setWalkInForm(prev => ({ ...prev, partySize: v }))}
                    >
                      <SelectTrigger id="partySize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} guest{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tableId" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Assign Table
                    </Label>
                    <Select 
                      value={walkInForm.tableId || "none"} 
                      onValueChange={(v) => setWalkInForm(prev => ({ ...prev, tableId: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger id="tableId">
                        <SelectValue placeholder="Select table..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No table</SelectItem>
                        {!tablesLoading && availableTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            {table.table_number} ({table.seats} seats)
                            {table.location_zone && ` • ${table.location_zone}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional fields for new guests */}
                {isNewGuest && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Phone
                      </Label>
                      <Input
                        id="guestPhone"
                        placeholder="+62..."
                        value={walkInForm.guestPhone}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, guestPhone: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guestEmail" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <Input
                        id="guestEmail"
                        type="email"
                        placeholder="guest@email.com"
                        value={walkInForm.guestEmail}
                        onChange={(e) => setWalkInForm(prev => ({ ...prev, guestEmail: e.target.value }))}
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label className="flex items-center gap-2">
                        <Cigarette className="w-4 h-4 text-muted-foreground" />
                        Seating Preference
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={walkInForm.smokingPreference === 'non-smoking' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setWalkInForm(prev => ({ ...prev, smokingPreference: 'non-smoking' }))}
                        >
                          Non-Smoking
                        </Button>
                        <Button
                          type="button"
                          variant={walkInForm.smokingPreference === 'smoking' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => setWalkInForm(prev => ({ ...prev, smokingPreference: 'smoking' }))}
                        >
                          Smoking
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Special requests..."
                    value={walkInForm.notes}
                    onChange={(e) => setWalkInForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setMode('idle')}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                    onClick={handleWalkInCheckIn}
                    disabled={isProcessing || !walkInForm.guestName.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2" />
                    )}
                    Check In
                  </Button>
                </div>
              </>
            )}

            {/* Cancel button when no guest selected yet */}
            {!walkInForm.guestName && !selectedGuestId && (
              <Button variant="outline" className="w-full" onClick={() => setMode('idle')}>
                Cancel
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Quick Reference - only show when idle or manual */}
      {(mode === 'idle' || mode === 'manual') && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <CalendarCheck className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Tables</p>
            <p className="text-xs font-mono text-foreground">NTL-XXXXXX</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Ticket className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Passes</p>
            <p className="text-xs font-mono text-foreground">UUID</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <Package className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Packages</p>
            <p className="text-xs font-mono text-foreground">PKG-XXXXXXXX</p>
          </div>
        </div>
      )}
    </div>
  );
}