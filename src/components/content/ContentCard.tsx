import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Heart, Star, Eye } from 'lucide-react';

interface ContentCardProps {
  id: string;
  title: string;
  posterUrl?: string;
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
  posterUrl,
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
      className="group relative overflow-hidden bg-card hover:bg-card-hover transition-smooth cursor-pointer shadow-card hover:shadow-elevated hover-lift"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-background-secondary">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            className="w-full h-full object-cover transition-smooth group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-card">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 transition-smooth ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <Button variant="primary" size="lg" className="shadow-elevated">
              <Play className="h-5 w-5 ml-2" />
              مشاهدة
            </Button>
          </div>
          
          {/* Quick Actions */}
          <div className="absolute top-2 left-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => {
                e.stopPropagation();
                setIsFavorited(!isFavorited);
              }}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-primary/90 text-white">
            {getTypeLabel(type)}
          </Badge>
        </div>

        {/* Rating */}
        {rating && (
          <div className="absolute bottom-2 right-2 flex items-center space-x-1 bg-black/70 px-2 py-1 rounded">
            <Star className="h-3 w-3 text-accent fill-accent" />
            <span className="text-xs text-white font-medium">{rating}</span>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-card-foreground line-clamp-2 text-sm">
          {title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {year && <span>{year}</span>}
          {viewCount && (
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{viewCount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((category) => (
              <Badge 
                key={category} 
                variant="outline" 
                className="text-xs px-2 py-0 border-border text-muted-foreground"
              >
                {category}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};