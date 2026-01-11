import { 
  Building2, 
  TrendingUp, 
  Users, 
  Clock, 
  Calendar,
  AlertTriangle,
  Sparkles,
  Target,
  RefreshCw,
  Loader2,
  ArrowUp,
  ArrowDown,
  Lightbulb
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useVenueProfile, useRunVenueProfiler, getDayName, getHourLabel } from '@/hooks/useVenueProfiles';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SEGMENT_COLORS = [
  'hsl(var(--primary))',
  'hsl(262, 83%, 58%)',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(350, 89%, 60%)',
];

interface Venue360DashboardProps {
  venueId: string | undefined;
  venueName?: string;
}

export default function Venue360Dashboard({ venueId, venueName }: Venue360DashboardProps) {
  const { data: profile, isLoading, refetch } = useVenueProfile(venueId);
  const runProfiler = useRunVenueProfiler();

  const handleRefresh = async () => {
    if (venueId) {
      await runProfiler.mutateAsync(venueId);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Venue 360 Dashboard
          </CardTitle>
          <CardDescription>
            No venue profile calculated yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Run AI analysis to generate your venue's 360 profile
            </p>
            <Button onClick={handleRefresh} disabled={runProfiler.isPending}>
              {runProfiler.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare segment chart data
  const segmentChartData = (profile.top_customer_segments || []).map((seg, i) => ({
    name: seg.segment,
    value: seg.percentage,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Venue 360 Dashboard
          </CardTitle>
          <CardDescription>
            {venueName || 'Venue'} performance insights and AI recommendations
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={runProfiler.isPending}
        >
          {runProfiler.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Revenue (30d)</span>
            </div>
            <p className="text-xl font-bold">
              Rp {Math.round(profile.total_revenue_30d || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Bookings (30d)</span>
            </div>
            <p className="text-xl font-bold">{profile.total_bookings_30d || 0}</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs">Show-up Rate</span>
            </div>
            <p className="text-xl font-bold text-green-500">
              {Math.round((profile.avg_show_up_rate || 0) * 100)}%
            </p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">Promo Effectiveness</span>
            </div>
            <p className="text-xl font-bold">
              {Math.round(profile.promo_effectiveness_score || 0)}%
            </p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Segments Pie Chart */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Customer Segments
            </h3>
            {segmentChartData.length > 0 ? (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={segmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {segmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover p-2 rounded-lg shadow-lg border border-border text-xs">
                              <p className="font-medium">{payload[0].payload.name}</p>
                              <p className="text-muted-foreground">{payload[0].value}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No segment data available
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
              {segmentChartData.map((seg, i) => (
                <div key={seg.name} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span>{seg.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Times */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Peak Performance
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Best Days
                </p>
                <div className="flex flex-wrap gap-1">
                  {(profile.peak_days || []).slice(0, 3).map((day) => (
                    <Badge key={day.day} variant="default" className="text-xs">
                      {getDayName(day.day)} ({day.score}%)
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Slow Days
                </p>
                <div className="flex flex-wrap gap-1">
                  {(profile.slow_days || []).slice(0, 3).map((day) => (
                    <Badge key={day.day} variant="secondary" className="text-xs">
                      {getDayName(day.day)} ({day.score}%)
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Peak Hours
                </p>
                <div className="flex flex-wrap gap-1">
                  {(profile.peak_hours || []).slice(0, 4).map((hour) => (
                    <Badge key={hour.hour} variant="outline" className="text-xs">
                      {getHourLabel(hour.hour)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendations */}
        {(profile.ai_recommendations || []).length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              AI Recommendations
            </h3>
            <div className="grid gap-2">
              {(profile.ai_recommendations || []).map((rec, i) => (
                <div
                  key={i}
                  className="p-3 bg-primary/5 border border-primary/20 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{rec.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rec.reasoning}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Growth Opportunities & Risk Factors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Growth Opportunities */}
          {(profile.growth_opportunities || []).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ArrowUp className="w-4 h-4 text-green-500" />
                Growth Opportunities
              </h3>
              <div className="space-y-2">
                {(profile.growth_opportunities || []).map((opp, i) => (
                  <div key={i} className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="font-medium text-sm">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">{opp.description}</p>
                    <Badge variant="outline" className="text-xs mt-1 text-green-600">
                      {opp.impact} impact
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Factors */}
          {(profile.risk_factors || []).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-red-500" />
                Risk Factors
              </h3>
              <div className="space-y-2">
                {(profile.risk_factors || []).map((risk, i) => (
                  <div key={i} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="font-medium text-sm">{risk.title}</p>
                    <p className="text-xs text-muted-foreground">{risk.description}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs mt-1 ${risk.severity === 'high' ? 'text-red-600' : 'text-orange-600'}`}
                    >
                      {risk.severity} severity
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Last Updated */}
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {profile.last_calculated_at ? new Date(profile.last_calculated_at).toLocaleString() : 'Never'}
        </p>
      </CardContent>
    </Card>
  );
}
