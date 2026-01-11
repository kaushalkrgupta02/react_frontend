import { useState } from 'react';
import { Star, ThumbsUp, Clock, MessageSquare, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSubmitFeedback } from '@/hooks/useFeedback';
import { toast } from 'sonner';

interface FeedbackSheetProps {
  venueId: string;
  venueName: string;
  bookingId?: string;
  children: React.ReactNode;
}

function StarRating({ 
  value, 
  onChange, 
  label 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 ${
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FeedbackSheet({ venueId, venueName, bookingId, children }: FeedbackSheetProps) {
  const [open, setOpen] = useState(false);
  const [overall, setOverall] = useState(0);
  const [service, setService] = useState(0);
  const [atmosphere, setAtmosphere] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [waitTime, setWaitTime] = useState<number | undefined>();
  const [wouldRecommend, setWouldRecommend] = useState<boolean | undefined>();
  const [feedbackText, setFeedbackText] = useState('');

  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async () => {
    if (overall === 0) {
      toast.error('Please rate your overall experience');
      return;
    }

    try {
      await submitFeedback.mutateAsync({
        venueId,
        bookingId,
        overallRating: overall,
        serviceRating: service || undefined,
        atmosphereRating: atmosphere || undefined,
        valueRating: valueRating || undefined,
        waitTimeMinutes: waitTime,
        wouldRecommend,
        feedbackText: feedbackText.trim() || undefined,
      });

      toast.success('Thank you for your feedback!');
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const resetForm = () => {
    setOverall(0);
    setService(0);
    setAtmosphere(0);
    setValueRating(0);
    setWaitTime(undefined);
    setWouldRecommend(undefined);
    setFeedbackText('');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl">Rate Your Experience</SheetTitle>
          <p className="text-sm text-muted-foreground">at {venueName}</p>
        </SheetHeader>

        <div className="space-y-6">
          {/* Overall Rating - Required */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <StarRating
              value={overall}
              onChange={setOverall}
              label="Overall Experience *"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border">
              <StarRating
                value={service}
                onChange={setService}
                label="Service Quality"
              />
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <StarRating
                value={atmosphere}
                onChange={setAtmosphere}
                label="Atmosphere & Vibe"
              />
            </div>
            <div className="bg-card rounded-xl p-4 border border-border">
              <StarRating
                value={valueRating}
                onChange={setValueRating}
                label="Value for Money"
              />
            </div>
          </div>

          {/* Wait Time */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              How long did you wait to get in?
            </Label>
            <div className="flex gap-2 flex-wrap">
              {[0, 5, 10, 15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setWaitTime(mins)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    waitTime === mins
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {mins === 0 ? 'No wait' : `${mins} min`}
                </button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
              <ThumbsUp className="w-4 h-4" />
              Would you recommend this venue?
            </Label>
            <div className="flex gap-3">
              <button
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  wouldRecommend === true
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Yes, definitely!
              </button>
              <button
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                  wouldRecommend === false
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                Not really
              </button>
            </div>
          </div>

          {/* Written Feedback */}
          <div className="bg-card rounded-xl p-4 border border-border">
            <Label className="text-sm text-muted-foreground flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4" />
              Any additional comments?
            </Label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us more about your experience..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={overall === 0 || submitFeedback.isPending}
            className="w-full"
          >
            {submitFeedback.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
