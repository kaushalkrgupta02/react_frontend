import { useState, useRef, TouchEvent, MouseEvent, useCallback } from 'react';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Calendar, Users, Clock, MessageSquare, Check, X, Loader2, UserCheck, AlertTriangle, UserX, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Undo2, QrCode, BarChart3 } from 'lucide-react';
import { useAdminBookings, AdminBooking } from '@/hooks/useAdminBookings';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trackBookingOutcome } from '@/hooks/useAnalyticsTracking';
import { playCheckInSound, playNoShowSound, playUndoSound } from '@/lib/audioFeedback';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CheckInDialog from './CheckInDialog';
import { DateRangeFilter, DateRange, getPresetDateRange } from './DateRangeFilter';
import { BookingGuestsProgress } from './guests';

import BookingStats from './stats/BookingStats';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const arrivalLabels: Record<string, string> = {
  before_10pm: 'Before 10pm',
  '10_to_11pm': '10–11pm',
  after_11pm: 'After 11pm',
};

type SubTab = 'requests' | 'confirmed' | 'tonight' | 'stats';

const SWIPE_THRESHOLD = 80; // pixels needed to trigger action
const MAX_SWIPE = 120; // max swipe distance

function SwipeableBookingCard({
  booking,
  onCheckIn,
  isCheckedIn,
  isCheckingIn,
}: {
  booking: AdminBooking;
  onCheckIn: (outcome: 'showed' | 'no_show', spendAmount?: number) => void;
  isCheckedIn?: boolean;
  isCheckingIn?: boolean;
}) {
  const [spendAmount, setSpendAmount] = useState('');
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const isDragging = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  // Haptic feedback helper
  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15); // Short 15ms vibration
    }
  };

  // Touch handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (isCheckedIn || isCheckingIn) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    hasTriggeredHaptic.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping || isCheckedIn || isCheckingIn) return;
    
    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;
    
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }
    
    if (isHorizontalSwipe.current) {
      e.preventDefault();
      const clampedX = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      
      // Trigger haptic when crossing threshold
      if (!hasTriggeredHaptic.current && Math.abs(clampedX) > SWIPE_THRESHOLD) {
        triggerHaptic();
        hasTriggeredHaptic.current = true;
      } else if (hasTriggeredHaptic.current && Math.abs(clampedX) <= SWIPE_THRESHOLD) {
        // Reset if user swipes back below threshold
        hasTriggeredHaptic.current = false;
      }
      
      setSwipeX(clampedX);
    }
  };

  const handleTouchEnd = () => {
    handleSwipeEnd();
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: MouseEvent) => {
    if (isCheckedIn || isCheckingIn) return;
    // Don't interfere with input clicks
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    
    startX.current = e.clientX;
    startY.current = e.clientY;
    isHorizontalSwipe.current = null;
    hasTriggeredHaptic.current = false;
    isDragging.current = true;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !isSwiping || isCheckedIn || isCheckingIn) return;
    
    const deltaX = e.clientX - startX.current;
    const deltaY = e.clientY - startY.current;
    
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }
    
    if (isHorizontalSwipe.current) {
      e.preventDefault();
      const clampedX = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
      
      // Trigger haptic when crossing threshold
      if (!hasTriggeredHaptic.current && Math.abs(clampedX) > SWIPE_THRESHOLD) {
        triggerHaptic();
        hasTriggeredHaptic.current = true;
      } else if (hasTriggeredHaptic.current && Math.abs(clampedX) <= SWIPE_THRESHOLD) {
        hasTriggeredHaptic.current = false;
      }
      
      setSwipeX(clampedX);
    }
  };

  const handleMouseUp = () => {
    if (isDragging.current) {
      handleSwipeEnd();
    }
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    if (isDragging.current) {
      handleSwipeEnd();
    }
    isDragging.current = false;
  };

  const handleSwipeEnd = () => {
    if (!isSwiping || isCheckedIn || isCheckingIn) {
      setIsSwiping(false);
      return;
    }
    
    if (swipeX > SWIPE_THRESHOLD) {
      // Swipe right = Check In
      const spend = parseFloat(spendAmount) || undefined;
      onCheckIn('showed', spend);
      setSpendAmount('');
    } else if (swipeX < -SWIPE_THRESHOLD) {
      // Swipe left = No Show
      onCheckIn('no_show');
    }
    
    setSwipeX(0);
    setIsSwiping(false);
    isHorizontalSwipe.current = null;
  };

  const handleCheckIn = (outcome: 'showed' | 'no_show') => {
    const spend = outcome === 'showed' ? (parseFloat(spendAmount) || undefined) : undefined;
    onCheckIn(outcome, spend);
    setSpendAmount('');
  };

  // Calculate background colors based on swipe direction
  const getSwipeIndicator = () => {
    if (isCheckedIn || !isSwiping) return null;
    
    const absSwipe = Math.abs(swipeX);
    const opacity = Math.min(absSwipe / SWIPE_THRESHOLD, 1);
    const isTriggered = absSwipe > SWIPE_THRESHOLD;
    
    if (swipeX > 0) {
      // Swiping right - Check In
      return (
        <div 
          className="absolute inset-0 rounded-xl flex items-center justify-start pl-4 transition-colors"
          style={{ 
            backgroundColor: `hsl(142 76% 36% / ${opacity * 0.3})`,
            borderColor: isTriggered ? 'hsl(142 76% 36%)' : 'transparent',
            borderWidth: isTriggered ? '2px' : '0'
          }}
        >
          <div className={`flex items-center gap-2 text-green-500 transition-transform ${isTriggered ? 'scale-110' : ''}`}>
            <UserCheck className="w-6 h-6" />
            <span className="font-medium">Check In</span>
          </div>
        </div>
      );
    } else if (swipeX < 0) {
      // Swiping left - No Show
      return (
        <div 
          className="absolute inset-0 rounded-xl flex items-center justify-end pr-4 transition-colors"
          style={{ 
            backgroundColor: `hsl(38 92% 50% / ${opacity * 0.3})`,
            borderColor: isTriggered ? 'hsl(38 92% 50%)' : 'transparent',
            borderWidth: isTriggered ? '2px' : '0'
          }}
        >
          <div className={`flex items-center gap-2 text-amber-500 transition-transform ${isTriggered ? 'scale-110' : ''}`}>
            <span className="font-medium">No Show</span>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe indicator background */}
      {getSwipeIndicator()}
      
      {/* Card content */}
      <div 
        className={`relative bg-card rounded-xl p-4 border space-y-3 select-none ${
          isCheckedIn ? 'border-green-500/50 bg-green-500/5' : 'border-border'
        } ${isSwiping ? 'cursor-grabbing' : 'cursor-grab'} ${isSwiping ? '' : 'transition-transform duration-200'}`}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Swipe hint for unchecked cards */}
        {!isCheckedIn && !isCheckingIn && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none opacity-20">
            <ChevronLeft className="w-4 h-4 text-amber-500" />
            <ChevronRight className="w-4 h-4 text-green-500" />
          </div>
        )}
        
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-foreground">{booking.venue?.name || 'Unknown Venue'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ref: {booking.booking_reference}
            </p>
          </div>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            isCheckedIn ? 'bg-green-500/20 text-green-500' :
            booking.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
            booking.status === 'confirmed' ? 'bg-blue-500/20 text-blue-500' :
            booking.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
            'bg-muted text-muted-foreground'
          }`}>
            {isCheckedIn ? 'Checked In' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{booking.party_size} guests</span>
          </div>
          {booking.arrival_window && (
            <div className="flex items-center gap-2 text-muted-foreground col-span-2">
              <Clock className="w-4 h-4" />
              <span>{arrivalLabels[booking.arrival_window] || booking.arrival_window}</span>
            </div>
          )}
        </div>

        {/* Guest-level tracking */}
        <div className="pt-2 border-t border-border">
          <BookingGuestsProgress 
            bookingId={booking.id} 
            partySize={booking.party_size}
          />
        </div>

        {booking.special_requests && (
          <div className="flex gap-2 text-sm">
            <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">{booking.special_requests}</p>
          </div>
        )}

        {!isCheckedIn && (
          <div className="pt-2 border-t border-border space-y-3">
            {/* Spend Amount Input */}
            <div className="flex items-center gap-2">
              <Label htmlFor={`spend-${booking.id}`} className="text-sm text-muted-foreground whitespace-nowrap">
                Spend:
              </Label>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-sm text-muted-foreground">Rp</span>
                <Input
                  id={`spend-${booking.id}`}
                  type="number"
                  placeholder="Optional"
                  value={spendAmount}
                  onChange={(e) => setSpendAmount(e.target.value)}
                  className="h-8 text-sm"
                  disabled={isCheckingIn}
                />
              </div>
            </div>
            
            {/* Check In / No Show Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCheckIn('no_show')}
                disabled={isCheckingIn}
                className="flex-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              >
                {isCheckingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    No Show
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCheckInDialog(true)}
                disabled={isCheckingIn}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isCheckingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-1" />
                    Check In
                  </>
                )}
              </Button>
            </div>
            
            {/* Swipe hint text */}
            <p className="text-xs text-center text-muted-foreground/60">
              Swipe right to check in • Swipe left for no-show
            </p>
          </div>
        )}

        {/* Check-In Dialog */}
        <CheckInDialog
          open={showCheckInDialog}
          onOpenChange={setShowCheckInDialog}
          bookingReference={booking.booking_reference}
          venueName={booking.venue?.name || 'Unknown Venue'}
          guestCount={booking.party_size}
          onCheckIn={(outcome, spend) => {
            handleCheckIn(outcome === 'showed' ? 'showed' : 'no_show');
            if (spend) setSpendAmount(spend.toString());
            setShowCheckInDialog(false);
          }}
          isProcessing={isCheckingIn}
          bookingId={booking.id}
          venueId={booking.venue_id}
        />
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  showActions,
  onConfirm,
  onDecline,
  isUpdating,
}: {
  booking: AdminBooking;
  showActions?: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
  isUpdating?: boolean;
}) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{booking.venue?.name || 'Unknown Venue'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ref: {booking.booking_reference}
          </p>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          booking.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
          booking.status === 'confirmed' ? 'bg-blue-500/20 text-blue-500' :
          booking.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
          'bg-muted text-muted-foreground'
        }`}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{format(parseISO(booking.booking_date), 'MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{booking.party_size} guests</span>
        </div>
        {booking.arrival_window && (
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Clock className="w-4 h-4" />
            <span>{arrivalLabels[booking.arrival_window] || booking.arrival_window}</span>
          </div>
        )}
      </div>

      {/* Guest-level tracking */}
      <div className="pt-2 border-t border-border">
        <BookingGuestsProgress 
          bookingId={booking.id} 
          partySize={booking.party_size}
          compact
        />
      </div>

      {booking.special_requests && (
        <div className="flex gap-2 text-sm">
          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{booking.special_requests}</p>
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1" />
                Confirm
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            disabled={isUpdating}
            className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <X className="w-4 h-4 mr-1" />
                Decline
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

interface VenueModeBookingsProps {
  selectedVenueId: string | null;
}

export default function VenueModeBookings({ selectedVenueId }: VenueModeBookingsProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('tonight');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetDateRange('today'));
  
  // Use date filtering for requests and confirmed tabs, today only for tonight
  const effectiveDateRange = activeTab === 'tonight' 
    ? { start: startOfDay(new Date()), end: endOfDay(new Date()) }
    : { start: dateRange.start, end: dateRange.end };

  const { bookings, isLoading, updateBookingStatus } = useAdminBookings(selectedVenueId, {
    startDate: effectiveDateRange.start,
    endDate: effectiveDateRange.end,
  });
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());
  const [noShowIds, setNoShowIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [spendAmounts, setSpendAmounts] = useState<Map<string, number>>(new Map());
  const [searchedBooking, setSearchedBooking] = useState<AdminBooking | null>(null);
  const [isSearchingBooking, setIsSearchingBooking] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  // Sort helper: latest first by created_at
  const sortByLatest = (a: AdminBooking, b: AdminBooking) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

  const pendingBookings = bookings
    .filter(b => b.status === 'pending')
    .sort(sortByLatest);
  const confirmedBookings = bookings
    .filter(b => b.status === 'confirmed' && b.booking_date >= today)
    .sort(sortByLatest);
  const tonightBookings = bookings
    .filter(b => b.status === 'confirmed' && b.booking_date === today)
    .sort(sortByLatest);

  // Get remaining unchecked bookings (not checked in and not already marked as no-show)
  const remainingBookings = tonightBookings.filter(
    b => !checkedInIds.has(b.id) && !noShowIds.has(b.id)
  );

  // Calculate stats for tonight
  const totalGuestsExpected = tonightBookings.reduce((sum, b) => sum + b.party_size, 0);
  const checkedInGuests = tonightBookings
    .filter(b => checkedInIds.has(b.id))
    .reduce((sum, b) => sum + b.party_size, 0);
  const noShowGuests = tonightBookings
    .filter(b => noShowIds.has(b.id))
    .reduce((sum, b) => sum + b.party_size, 0);
  const totalRevenue = Array.from(spendAmounts.values()).reduce((sum, amount) => sum + amount, 0);

  const handleUpdateStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setUpdatingId(bookingId);
    const result = await updateBookingStatus(bookingId, status);
    if (result.success) {
      toast.success(status === 'confirmed' ? 'Booking confirmed' : 'Booking declined');
    } else {
      toast.error(result.error || 'Failed to update');
    }
    setUpdatingId(null);
  };

  const UNDO_TIMEOUT = 8000; // 8 seconds to undo

  const handleUndoNoShow = useCallback((bookingId: string) => {
    setNoShowIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(bookingId);
      return newSet;
    });
    playUndoSound();
    toast.success('No-show undone', { description: 'Guest returned to pending check-in' });
  }, []);

  const handleCheckIn = async (bookingId: string, venueId: string, outcome: 'showed' | 'no_show', spendAmount?: number) => {
    setCheckingInId(bookingId);
    const result = await trackBookingOutcome(bookingId, venueId, outcome, {
      spendAmount,
    });
    
    if (result.success) {
      if (outcome === 'showed') {
        setCheckedInIds(prev => new Set([...prev, bookingId]));
        if (spendAmount) {
          setSpendAmounts(prev => new Map(prev).set(bookingId, spendAmount));
        }
        playCheckInSound();
        toast.success('Guest checked in!', {
          description: spendAmount ? `Spend: Rp ${spendAmount.toLocaleString()}` : undefined,
        });
      } else {
        setNoShowIds(prev => new Set([...prev, bookingId]));
        playNoShowSound();
        toast.warning('Marked as no-show', {
          duration: UNDO_TIMEOUT,
          action: {
            label: 'Undo',
            onClick: () => handleUndoNoShow(bookingId),
          },
        });
      }
    } else {
      toast.error('Failed to record outcome');
    }
    setCheckingInId(null);
  };

  const handleBulkNoShow = async () => {
    setIsBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const booking of remainingBookings) {
      const result = await trackBookingOutcome(booking.id, booking.venue_id, 'no_show', {});
      if (result.success) {
        setNoShowIds(prev => new Set([...prev, booking.id]));
        successCount++;
      } else {
        failCount++;
      }
    }

    setIsBulkProcessing(false);
    
    if (successCount > 0) {
      toast.success(`Marked ${successCount} guest${successCount > 1 ? 's' : ''} as no-show`, {
        description: failCount > 0 ? `${failCount} failed` : 'All remaining bookings processed',
      });
    } else if (failCount > 0) {
      toast.error('Failed to mark guests as no-show');
    }
  };

  const handleBookingSearch = useCallback((code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    
    setIsSearchingBooking(true);
    
    // Search in tonight's bookings first
    const found = tonightBookings.find(
      b => b.booking_reference.toUpperCase() === trimmed || b.id === trimmed
    );
    
    if (found) {
      setSearchedBooking(found);
      // Scroll to the booking card if not checked in
      if (!checkedInIds.has(found.id) && !noShowIds.has(found.id)) {
        toast.success(`Found booking: ${found.venue?.name || 'Booking'}`, {
          description: `${found.party_size} guests • Ref: ${found.booking_reference}`,
        });
      }
    } else {
      toast.error('Booking not found in tonight\'s list');
      setSearchedBooking(null);
    }
    
    setIsSearchingBooking(false);
  }, [tonightBookings, checkedInIds, noShowIds]);
  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border bg-background px-4">
        <button
          onClick={() => setActiveTab('tonight')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'tonight'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Tonight
          {tonightBookings.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-primary text-white text-xs">
              {tonightBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Requests
          {pendingBookings.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs">
              {pendingBookings.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'confirmed'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 flex items-center justify-center gap-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Date Range Filter - Show for requests and confirmed tabs */}
      {activeTab !== 'tonight' && (
        <div className="px-4 py-3 bg-card border-b border-border">
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      )}

      {/* Tonight Stats Summary */}
      {activeTab === 'tonight' && tonightBookings.length > 0 && (
        <div className="px-4 py-4 bg-card border-b border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Expected */}
            <div className="bg-background rounded-lg p-3 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Expected</span>
              </div>
              <p className="text-xl font-bold text-foreground">{totalGuestsExpected}</p>
              <p className="text-xs text-muted-foreground">{tonightBookings.length} bookings</p>
            </div>
            
            {/* Checked In */}
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-xs">Checked In</span>
              </div>
              <p className="text-xl font-bold text-green-500">{checkedInGuests}</p>
              <p className="text-xs text-green-500/70">{checkedInIds.size} bookings</p>
            </div>
            
            {/* No Shows */}
            <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">No Shows</span>
              </div>
              <p className="text-xl font-bold text-amber-500">{noShowGuests}</p>
              <p className="text-xs text-amber-500/70">{noShowIds.size} bookings</p>
            </div>
            
            {/* Revenue */}
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs">Revenue</span>
              </div>
              <p className="text-xl font-bold text-primary">
                {totalRevenue > 0 ? `Rp ${(totalRevenue / 1000).toFixed(0)}k` : '—'}
              </p>
              <p className="text-xs text-primary/70">
                {totalRevenue > 0 ? `Rp ${totalRevenue.toLocaleString()}` : 'No spend recorded'}
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">Check-in Progress</span>
              <span className="font-medium text-foreground">
                {tonightBookings.length > 0 
                  ? Math.round(((checkedInIds.size + noShowIds.size) / tonightBookings.length) * 100)
                  : 0}% complete
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {/* Checked in portion (green) */}
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ 
                  width: tonightBookings.length > 0 
                    ? `${(checkedInIds.size / tonightBookings.length) * 100}%` 
                    : '0%' 
                }}
              />
              {/* No-show portion (amber) */}
              <div 
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ 
                  width: tonightBookings.length > 0 
                    ? `${(noShowIds.size / tonightBookings.length) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{checkedInIds.size} checked in</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{noShowIds.size} no-show</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                <span>{remainingBookings.length} pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'tonight' && (
          tonightBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No bookings for tonight</p>
            </div>
          ) : (
            <>
              {/* Searched booking highlighted */}
              {searchedBooking && !checkedInIds.has(searchedBooking.id) && !noShowIds.has(searchedBooking.id) && (
                <div className="border-2 border-primary rounded-xl">
                  <SwipeableBookingCard
                    key={searchedBooking.id}
                    booking={searchedBooking}
                    onCheckIn={(outcome, spendAmount) => {
                      handleCheckIn(searchedBooking.id, searchedBooking.venue_id, outcome, spendAmount);
                      setSearchedBooking(null);
                    }}
                    isCheckedIn={false}
                    isCheckingIn={checkingInId === searchedBooking.id}
                  />
                </div>
              )}
              
              {/* Checked In bookings first */}
              {tonightBookings
                .filter(b => checkedInIds.has(b.id) && b.id !== searchedBooking?.id)
                .map(booking => (
                  <SwipeableBookingCard
                    key={booking.id}
                    booking={booking}
                    onCheckIn={(outcome, spendAmount) => handleCheckIn(booking.id, booking.venue_id, outcome, spendAmount)}
                    isCheckedIn={true}
                    isCheckingIn={checkingInId === booking.id}
                  />
                ))}
              
              {/* Pending bookings */}
              {tonightBookings
                .filter(b => !checkedInIds.has(b.id) && !noShowIds.has(b.id) && b.id !== searchedBooking?.id)
                .map(booking => (
                  <SwipeableBookingCard
                    key={booking.id}
                    booking={booking}
                    onCheckIn={(outcome, spendAmount) => handleCheckIn(booking.id, booking.venue_id, outcome, spendAmount)}
                    isCheckedIn={false}
                    isCheckingIn={checkingInId === booking.id}
                  />
                ))}
              
              {/* Bulk No-Show Button - at the end of list */}
              {remainingBookings.length > 0 && (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-amber-600/80 hover:text-amber-600 hover:bg-amber-500/10"
                        disabled={isBulkProcessing}
                      >
                        {isBulkProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4 mr-2" />
                            Mark All as No-Show ({remainingBookings.length})
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mark all as no-show?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will mark {remainingBookings.length} remaining guest{remainingBookings.length > 1 ? 's' : ''} as no-show. 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkNoShow}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Mark All No-Show
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </>
          )
        )}

        {activeTab === 'requests' && (
          pendingBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            pendingBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showActions
                onConfirm={() => handleUpdateStatus(booking.id, 'confirmed')}
                onDecline={() => handleUpdateStatus(booking.id, 'cancelled')}
                isUpdating={updatingId === booking.id}
              />
            ))
          )
        )}

        {activeTab === 'confirmed' && (
          confirmedBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No confirmed bookings</p>
            </div>
          ) : (
            confirmedBookings.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
              />
            ))
          )
        )}

        {activeTab === 'stats' && (
          <BookingStats bookings={bookings} isLoading={isLoading} />
        )}
      </div>

    </div>
  );
}
