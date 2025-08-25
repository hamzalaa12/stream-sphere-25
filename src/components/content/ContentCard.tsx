import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Heart, Star, Eye } from 'lucide-react';

interface ContentCardProps {
  id: string;
  title: string;
  title_ar?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  year?: number;
  type: 'movie' | 'series' | 'anime';
  categories?: string[];
  viewCount?: number;
  onClick?: () => void;
}

export const ContentCard = ({
  id,
  title,
  title_ar,
  poster_url,
  backdrop_url,
  rating,
  year,
  type,
  categories = [],
  viewCount,
  onClick,
}: ContentCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'فيلم';
      case 'series': return 'مسلسل';
      case 'anime': return 'أنمي';
      default: return type;
    }
  };

  return (
    <Card
      className="group relative overflow-hidden bg-card hover:bg-card-hover transition-smooth cursor-pointer shadow-card hover:shadow-elevated transform hover:scale-105 duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-background-secondary rounded-lg">
        {poster_url ? (
          <img
            src={poster_url}
            alt={title}
            className="w-full h-full object-cover transition-smooth group-hover:scale-105"
            loading="lazy"
          />
        ) : backdrop_url ? (
          <img
            src={backdrop_url}
            alt={title}
            className="w-full h-full object-cover transition-smooth group-hover:scale-105 opacity-80"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-card">
            <Play className="h-12 w-12 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center px-2">{getTypeLabel(type)}</span>
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white shadow-lg backdrop-blur-sm border border-white/20"
            >
              <Play className="h-4 w-4 ml-1" />
              مش��هدة
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 left-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm border border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorited(!isFavorited);
              }}
            >
              <Heart className={`h-3 w-3 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-primary/90 text-white text-xs backdrop-blur-sm">
            {getTypeLabel(type)}
          </Badge>
        </div>

        {/* Rating Badge */}
        {rating && rating > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md backdrop-blur-sm">
            <Star className="h-3 w-3 text-accent fill-accent" />
            <span className="text-xs text-white font-medium">{rating ? rating.toFixed(1) : 'غير متاح'}</span>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-3 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-card-foreground line-clamp-2 text-sm leading-tight">
            {title_ar || title}
          </h3>
          {title_ar && title_ar !== title && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {title}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {year && <span>{year}</span>}
            {rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-accent fill-accent" />
                <span className="font-medium">{rating ? rating.toFixed(1) : 'غير متاح'}</span>
              </div>
            )}
          </div>
          {viewCount && viewCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{viewCount.toLocaleString('ar')}</span>
            </div>
          )}
        </div>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((category, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs px-2 py-0 border-border text-muted-foreground hover:bg-primary/10 transition-colors"
              >
                {category}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge
                variant="outline"
                className="text-xs px-2 py-0 border-border text-muted-foreground"
              >
                +{categories.length - 2}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
