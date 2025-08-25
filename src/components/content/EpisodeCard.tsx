import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Download, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EpisodeCardProps {
  episode: {
    id: string;
    title?: string;
    episode_number: number;
    duration?: number;
    thumbnail_url?: string;
    description?: string;
  };
  season?: {
    season_number: number;
  };
  isCurrentEpisode?: boolean;
  compact?: boolean;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  season,
  isCurrentEpisode = false,
  compact = false
}) => {
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  if (compact) {
    return (
      <Link
        to={`/watch/episode/${episode.id}`}
        className={`block p-4 rounded-lg transition-all border-2 ${
          isCurrentEpisode
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="font-semibold text-lg">
              الحلقة {episode.episode_number}
              {episode.title && `: ${episode.title}`}
            </h4>
            {isCurrentEpisode && (
              <Badge variant="default" className="text-xs">جاري المشاهدة</Badge>
            )}
          </div>
          {episode.duration && (
            <span className="text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(episode.duration)}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
      <CardContent className="p-0">
        <div className="flex gap-6 p-6">
          {episode.thumbnail_url && (
            <div className="relative">
              <img
                src={episode.thumbnail_url}
                alt={episode.title}
                className="w-40 h-24 object-cover rounded-lg border"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Play className="h-8 w-8 text-white" />
              </div>
            </div>
          )}
          <div className="flex-1 space-y-3">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                الحلقة {episode.episode_number}
                {episode.title && `: ${episode.title}`}
              </h3>
              {episode.duration && (
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(episode.duration)}
                </span>
              )}
            </div>
            {episode.description && (
              <p className="text-muted-foreground leading-relaxed">
                {episode.description}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Link to={`/watch/episode/${episode.id}`}>
                <Button className="gap-2">
                  <Play className="h-4 w-4" />
                  شاهد الآن
                </Button>
              </Link>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                حمل الآن
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};