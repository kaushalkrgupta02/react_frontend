import { useState, useEffect } from 'react';
import { Users, Home, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface AudienceProximityCardProps {
  venueId?: string | null;
}

export default function AudienceProximityCard({ venueId }: AudienceProximityCardProps) {
  const [homeZoneCount, setHomeZoneCount] = useState(0);
  const [officeZoneCount, setOfficeZoneCount] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);

  useEffect(() => {
    // Mock audience data - in production this would come from venue_audience_insights table
    setHomeZoneCount(Math.floor(Math.random() * 2000) + 500);
    setOfficeZoneCount(Math.floor(Math.random() * 3000) + 1000);
    setWeeklyGrowth(Math.floor(Math.random() * 10) + 2);
  }, [venueId]);

  const totalAudience = homeZoneCount + officeZoneCount;
  const homePercentage = Math.round((homeZoneCount / totalAudience) * 100);
  const officePercentage = 100 - homePercentage;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4 text-accent" />
          Potential Audience
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Count */}
        <div className="text-center py-2">
          <p className="text-3xl font-bold text-foreground">{totalAudience.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">App users in your reach zone</p>
          <div className="flex items-center justify-center gap-1 mt-1 text-status-ideal">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs font-medium">+{weeklyGrowth}% this week</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Home className="w-4 h-4" />
                Live nearby (5km)
              </span>
              <span className="font-medium text-foreground">{homeZoneCount.toLocaleString()}</span>
            </div>
            <Progress value={homePercentage} className="h-2" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                Work nearby (2km)
              </span>
              <span className="font-medium text-foreground">{officeZoneCount.toLocaleString()}</span>
            </div>
            <Progress value={officePercentage} className="h-2" />
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">
            💡 <span className="text-foreground font-medium">{Math.round(officeZoneCount * 0.15)}</span> office workers 
            could be reached with after-work promos (5-8pm)
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Privacy-safe aggregate counts only • Last calculated today
        </p>
      </CardContent>
    </Card>
  );
}
