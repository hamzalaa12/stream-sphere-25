import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Clock,
  Calendar,
  Eye,
  Download,
  Check,
  Bookmark,
  Star,
  MoreHorizontal,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { FadeInUp, HoverAnimation, ProgressAnimation } from '@/components/ui/animated-component';

interface EpisodeCardProps {
  id: string;
  title?: string;
  episodeNumber: number;
  seasonNumber: number;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  release_date?: string;
  view_count?: number;
  contentTitle: string;
  contentId: string;
  contentType: 'series' | 'anime';
  isWatched?: boolean;
  watchProgress?: number;
  onClick?: () => void;
  variant?: 'default' | 'compact' | 'detailed';
}

export const EpisodeCard = ({
  id,
  title,
  episodeNumber,
  seasonNumber,
  description,
  thumbnail_url,
  duration,
  release_date,
  view_count,
  contentTitle,
  contentId,
  contentType,
  isWatched = false,
  watchProgress = 0,
  onClick,
  variant = 'default'
}: EpisodeCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, id]);

  const checkBookmarkStatus = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('watch_history')
        .select('id')
        .eq('episode_id', id)
        .eq('user_id', user.id)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // Not bookmarked
    }
  };

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لحفظ تقدم المشاهدة'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isBookmarked) {
        await supabase
          .from('watch_history')
          .delete()
          .eq('episode_id', id)
          .eq('user_id', user.id);
        setIsBookmarked(false);
        toast({ title: 'تم', description: 'تم حذف الحلقة من قائمة المشاهدة' });
      } else {
        await supabase
          .from('watch_history')
          .upsert({
            episode_id: id,
            user_id: user.id,
            watch_time: 0,
            completed: false,
            last_watched: new Date().toISOString()
          });
        setIsBookmarked(true);
        toast({ title: 'تم', description: 'تم إضافة الحلقة لقائمة المشاهدة' });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث قائمة المشاهدة',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ar', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEpisodeTitle = () => {
    return title || `الحلقة ${episodeNumber}`;
  };

  // Variant-specific styling
  const getCardClasses = () => {
    const baseClasses = "group cursor-pointer transition-all duration-300";
    
    switch (variant) {
      case 'compact':
        return `${baseClasses} hover:bg-card-hover`;
      case 'detailed':
        return `${baseClasses} hover:shadow-lg hover:scale-[1.02]`;
      default:
        return `${baseClasses} hover:shadow-md hover:scale-105`;
    }
  };

  const renderCompactVersion = () => (
    <div
      className={getCardClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 p-4 rounded-lg border border-border">
        {/* Episode Number */}
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <span className="font-bold text-primary">{episodeNumber}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-1">{getEpisodeTitle()}</h3>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(duration)}</span>
              </div>
            )}
            {view_count && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{view_count.toLocaleString('ar')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isWatched && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Check className="h-3 w-3 mr-1" />
              مُشاهدة
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
            disabled={isLoading}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {watchProgress > 0 && (
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${watchProgress}%` }}
          />
        </div>
      )}
    </div>
  );

  const renderDefaultVersion = () => (
    <Card
      className={getCardClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-background-secondary">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={getEpisodeTitle()}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <div className="text-center">
              <Play className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">الحلقة {episodeNumber}</p>
            </div>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play Button */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white shadow-lg backdrop-blur-sm"
          >
            <Play className="h-5 w-5 ml-1" />
            مشاهدة
          </Button>
        </div>

        {/* Status Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Badge variant="secondary" className="bg-primary/90 text-white">
            الموسم {seasonNumber}
          </Badge>
          
          {isWatched && (
            <Badge className="bg-green-500 text-white">
              <Check className="h-3 w-3 mr-1" />
              مُشاهدة
            </Badge>
          )}
        </div>

        {/* Episode Number */}
        <div className="absolute top-2 left-2">
          <div className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold backdrop-blur-sm">
            #{episodeNumber}
          </div>
        </div>

        {/* Duration */}
        {duration && (
          <div className="absolute bottom-2 right-2">
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
              <Clock className="h-3 w-3 inline ml-1" />
              {formatDuration(duration)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="absolute bottom-2 left-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
            disabled={isLoading}
            className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm rounded-full"
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/content/${contentId}`);
            }}
            className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm rounded-full"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        {watchProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${watchProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content Info */}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
              {getEpisodeTitle()}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {contentTitle} - الموسم {seasonNumber}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {release_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(release_date)}</span>
              </div>
            )}
          </div>
          
          {view_count && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{view_count.toLocaleString('ar')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderDetailedVersion = () => (
    <Card
      className={getCardClasses()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative w-32 aspect-video overflow-hidden bg-background-secondary rounded-lg flex-shrink-0">
          {thumbnail_url ? (
            <img
              src={thumbnail_url}
              alt={getEpisodeTitle()}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {/* Episode Number Overlay */}
          <div className="absolute top-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
            #{episodeNumber}
          </div>

          {/* Duration */}
          {duration && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {formatDuration(duration)}
            </div>
          )}

          {/* Progress */}
          {watchProgress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
              <div 
                className="h-full bg-primary"
                style={{ width: `${watchProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base line-clamp-1">
                {getEpisodeTitle()}
              </h3>
              <p className="text-sm text-muted-foreground">
                {contentTitle} • الموسم {seasonNumber} • الحلقة {episodeNumber}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isWatched && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  مُشاهدة
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleBookmark}
                disabled={isLoading}
              >
                <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {description && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {release_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(release_date)}</span>
                </div>
              )}
              
              {view_count && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{view_count.toLocaleString('ar')} مشاهدة</span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Play className="h-4 w-4 ml-1" />
              مشاهدة
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  // Render based on variant
  switch (variant) {
    case 'compact':
      return renderCompactVersion();
    case 'detailed':
      return renderDetailedVersion();
    default:
      return renderDefaultVersion();
  }
};
