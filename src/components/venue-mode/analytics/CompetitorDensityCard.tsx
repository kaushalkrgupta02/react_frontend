import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CompetitorVenue {
  id: string;
  name: string;
  distance: string;
  crowdLevel: 'quiet' | 'moderate' | 'busy' | 'very_busy' | 'packed';
  density: number;
  trend: 'up' | 'down' | 'stable';
}

interface CompetitorDensityCardProps {
  venueId?: string | null;
}

const crowdColors = {
  quiet: 'text-status-quiet bg-status-quiet/10',
  moderate: 'text-status-ideal bg-status-ideal/10',
  busy: 'text-status-busy bg-status-busy/10',
  very_busy: 'text-amber-500 bg-amber-500/10',
  packed: 'text-status-too-busy bg-status-too-busy/10',
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-status-busy" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-status-quiet" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

export default function CompetitorDensityCard({ venueId }: CompetitorDensityCardProps) {
  const [competitors, setCompetitors] = useState<CompetitorVenue[]>([]);
  const [areaAverage, setAreaAverage] = useState(0);
  const [yourDensity, setYourDensity] = useState(0);

  useEffect(() => {
    // Mock competitor data - in production this would come from Telkomsel API
    const mockCompetitors: CompetitorVenue[] = [
      { id: '1', name: 'Club Luminous', distance: '0.3 km', crowdLevel: 'busy', density: 72, trend: 'up' },
      { id: '2', name: 'Sky Lounge', distance: '0.5 km', crowdLevel: 'moderate', density: 45, trend: 'stable' },
      { id: '3', name: 'Neon Bar', distance: '0.8 km', crowdLevel: 'packed', density: 89, trend: 'down' },
      { id: '4', name: 'The Velvet', distance: '1.2 km', crowdLevel: 'quiet', density: 23, trend: 'stable' },
    ];
    
    setCompetitors(mockCompetitors);
    const avgDensity = mockCompetitors.reduce((sum, c) => sum + c.density, 0) / mockCompetitors.length;
    setAreaAverage(Math.round(avgDensity));
    setYourDensity(58); // Mock your venue's density
  }, [venueId]);

  const comparison = yourDensity - areaAverage;
  const comparisonText = comparison > 0 
    ? `${comparison}% above average` 
    : comparison < 0 
      ? `${Math.abs(comparison)}% below average`
      : 'At area average';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="w-4 h-4 text-primary" />
          Nearby Competition
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Your Position vs Area */}
        <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Your venue</span>
            <span className="font-medium text-foreground">{yourDensity}% capacity</span>
          </div>
          <Progress value={yourDensity} className="h-2" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Area average</span>
            <span className={cn(
              "font-medium",
              comparison > 0 ? "text-status-ideal" : comparison < 0 ? "text-status-busy" : "text-muted-foreground"
            )}>
              {comparisonText}
            </span>
          </div>
        </div>

        {/* Competitor List */}
        <div className="space-y-2">
          {competitors.map((competitor) => (
            <div 
              key={competitor.id}
              className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{competitor.name}</p>
                <p className="text-xs text-muted-foreground">{competitor.distance}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs", crowdColors[competitor.crowdLevel])}>
                  {competitor.density}%
                </Badge>
                <TrendIcon trend={competitor.trend} />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Based on Telkomsel location data • Updated 5 min ago
        </p>
      </CardContent>
    </Card>
  );
}
