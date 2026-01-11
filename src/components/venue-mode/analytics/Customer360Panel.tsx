import { useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Crown, 
  Target, 
  RefreshCw,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCustomerSegments, useRunSegmentation, CustomerSegment } from '@/hooks/useCustomerSegments';

const SEGMENT_ICONS: Record<string, string> = {
  'High Spender': '💎',
  'Weekend Warrior': '🎉',
  'Promo Hunter': '🎯',
  'VIP Regular': '👑',
  'Casual Visitor': '☕',
  'At Risk': '⚠️',
  'New Customer': '🆕',
  'Loyal Customer': '❤️',
};

const RFM_TIER_COLORS: Record<string, string> = {
  'Champion': 'bg-amber-500',
  'Loyal': 'bg-green-500',
  'Potential': 'bg-blue-500',
  'At Risk': 'bg-orange-500',
  'Hibernating': 'bg-red-500',
  'New': 'bg-cyan-500',
};

function getDayName(day: number | null): string {
  if (day === null) return 'N/A';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day] || 'N/A';
}

function getTimeLabel(hour: number | null): string {
  if (hour === null) return 'N/A';
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

interface Customer360PanelProps {
  venueId: string | undefined;
}

export default function Customer360Panel({ venueId }: Customer360PanelProps) {
  const { data: segments = [], isLoading, refetch } = useCustomerSegments();
  const runSegmentation = useRunSegmentation();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSegment | null>(null);

  const handleRefresh = async () => {
    await runSegmentation.mutateAsync();
    refetch();
  };

  // Group customers by segment
  const segmentGroups = segments.reduce((acc, customer) => {
    if (!acc[customer.segment_name]) {
      acc[customer.segment_name] = [];
    }
    acc[customer.segment_name].push(customer);
    return acc;
  }, {} as Record<string, CustomerSegment[]>);

  // Calculate overall stats
  const totalCustomers = segments.length;
  const avgClv = segments.length > 0
    ? segments.reduce((sum, s) => sum + (s.clv_score || 0), 0) / segments.length
    : 0;
  const highRiskCount = segments.filter(s => (s.no_show_risk || 0) > 0.5).length;
  const topSpenders = segments.filter(s => (s.clv_score || 0) > avgClv * 1.5).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Customer 360 View
          </CardTitle>
          <CardDescription>
            AI-powered customer micro-segmentation and insights
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={runSegmentation.isPending}
        >
          {runSegmentation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Recalculate
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Total Customers</span>
            </div>
            <p className="text-2xl font-bold">{totalCustomers}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Avg CLV</span>
            </div>
            <p className="text-2xl font-bold">Rp {Math.round(avgClv).toLocaleString()}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Crown className="w-4 h-4" />
              <span className="text-xs">Top Spenders</span>
            </div>
            <p className="text-2xl font-bold">{topSpenders}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs">High Risk</span>
            </div>
            <p className="text-2xl font-bold text-orange-500">{highRiskCount}</p>
          </div>
        </div>

        {/* Segment Distribution */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Segment Distribution</h3>
          <div className="space-y-2">
            {Object.entries(segmentGroups).map(([name, customers]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-lg">{SEGMENT_ICONS[name] || '👤'}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground">{customers.length}</span>
                  </div>
                  <Progress
                    value={(customers.length / totalCustomers) * 100}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Top Customers by CLV</h3>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {segments.slice(0, 20).map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(selectedCustomer?.id === customer.id ? null : customer)}
                  className="w-full p-3 bg-card rounded-lg border border-border hover:border-primary/50 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SEGMENT_ICONS[customer.segment_name] || '👤'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Customer #{customer.user_id.slice(0, 8)}</span>
                          <Badge variant="outline" className="text-xs">
                            {customer.segment_name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>CLV: Rp {Math.round(customer.clv_score || 0).toLocaleString()}</span>
                          <span>•</span>
                          <span>{customer.rfm_frequency || 0} visits</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedCustomer?.id === customer.id ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Details */}
                  {selectedCustomer?.id === customer.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-secondary/50 rounded p-2">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Calendar className="w-3 h-3" />
                            <span>Preferred Day</span>
                          </div>
                          <p className="font-medium">{getDayName(customer.preferred_day_of_week)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            <span>Preferred Time</span>
                          </div>
                          <p className="font-medium">{getTimeLabel(customer.preferred_arrival_hour)}</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <Target className="w-3 h-3" />
                            <span>Promo Response</span>
                          </div>
                          <p className="font-medium">{Math.round((customer.promo_responsiveness || 0) * 100)}%</p>
                        </div>
                        <div className="bg-secondary/50 rounded p-2">
                          <div className="flex items-center gap-1 text-muted-foreground mb-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>No-Show Risk</span>
                          </div>
                          <p className={`font-medium ${(customer.no_show_risk || 0) > 0.3 ? 'text-orange-500' : 'text-green-500'}`}>
                            {Math.round((customer.no_show_risk || 0) * 100)}%
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">RFM Tier:</span>
                        <Badge className={`text-xs text-white ${RFM_TIER_COLORS[customer.rfm_tier || ''] || 'bg-gray-500'}`}>
                          {customer.rfm_tier || 'Unknown'}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          R:{customer.rfm_recency_days || 0}d F:{customer.rfm_frequency || 0} M:Rp{Math.round(customer.rfm_monetary || 0).toLocaleString()}
                        </span>
                      </div>

                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Generate Personalized Offer
                      </Button>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
