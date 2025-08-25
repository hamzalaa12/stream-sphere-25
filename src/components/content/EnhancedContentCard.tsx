import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Heart,
  Star,
  Eye,
  Share2,
  Clock,
  Calendar,
  Info,
  Download,
  Plus,
  Check,
  Bookmark,
  TrendingUp,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ScaleIn, HoverAnimation } from '@/components/ui/animated-component';

interface EnhancedContentCardProps {
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
  duration?: number;
  description?: string;
  isTrending?: boolean;
  isNew?: boolean;
  isPersonalRecommendation?: boolean;
  matchScore?: number;
  onClick?: () => void;
  variant?: 'default' | 'large' | 'minimal' | 'hero';
}

export const EnhancedContentCard = ({
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
  duration,
  description,
  isTrending = false,
  isNew = false,
  isPersonalRecommendation = false,
  matchScore,
  onClick,
  variant = 'default',
}: EnhancedContentCardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (user) {
      checkUserStatus();
    }
  }, [user, id]);

  const checkUserStatus = async () => {
    if (!user) return;

    try {
      const [favoritesResult, watchlistResult] = await Promise.all([
        supabase
          .from('favorites')
          .select('id')
          .eq('content_id', id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('watch_history')
          .select('id')
          .eq('content_id', id)
          .eq('user_id', user.id)
          .single()
      ]);

      setIsFavorited(!!favoritesResult.data);
      setIsInWatchlist(!!watchlistResult.data);
    } catch (error) {
      // User status not found, which is normal
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة المحتوى للمفضلة'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('content_id', id)
          .eq('user_id', user.id);
        setIsFavorited(false);
        toast({ title: 'تم', description: 'تم حذف المحتوى من المفضلة' });
      } else {
        await supabase
          .from('favorites')
          .insert({ content_id: id, user_id: user.id });
        setIsFavorited(true);
        toast({ title: 'تم', description: 'تم إضافة المحتوى للمفضلة' });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المفضلة',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addToWatchlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة المحتوى لقائمة المشاهدة'
      });
      return;
    }

    setIsLoading(true);
    try {
      await supabase
        .from('watch_history')
        .upsert({
          content_id: id,
          user_id: user.id,
          watch_time: 0,
          completed: false,
          last_watched: new Date().toISOString()
        });
      setIsInWatchlist(true);
      toast({ title: 'تم', description: 'تم إضافة المحتوى لقائمة المشاهدة' });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة المحتوى لقائمة المشاهدة',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shareContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.share({
        title: title_ar || title,
        text: description || `شاهد ${title_ar || title} على StreamSphere`,
        url: `${window.location.origin}/content/${id}`
      });
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/content/${id}`);
      toast({ title: 'تم', description: 'تم نسخ الرابط' });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'فيلم';
      case 'series': return 'مسلسل';
      case 'anime': return 'أنمي';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Play className="h-3 w-3" />;
      case 'series': return <Eye className="h-3 w-3" />;
      case 'anime': return <Zap className="h-3 w-3" />;
      default: return <Play className="h-3 w-3" />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  // Variant-specific styling with enhanced animations
  const getCardClasses = () => {
    const baseClasses = "group relative overflow-hidden cursor-pointer transition-all duration-500 will-change-transform gpu-accelerated card-hover";

    switch (variant) {
      case 'large':
        return `${baseClasses} hover:scale-[1.02] hover:-translate-y-2 shadow-lg hover:shadow-2xl hover:shadow-primary/10`;
      case 'minimal':
        return `${baseClasses} hover:scale-105 hover:-translate-y-1 shadow-md hover:shadow-lg hover:shadow-primary/5`;
      case 'hero':
        return `${baseClasses} hover:scale-[1.01] hover:-translate-y-1 shadow-2xl hover:shadow-primary/15`;
      default:
        return `${baseClasses} hover:scale-105 hover:-translate-y-2 shadow-card hover:shadow-elevated hover:shadow-primary/10`;
    }
  };

  const getImageAspect = () => {
    switch (variant) {
      case 'large': return 'aspect-[16/9]';
      case 'hero': return 'aspect-[21/9]';
      default: return 'aspect-[2/3]';
    }
  };

  return (
    <ScaleIn triggerOnScroll threshold={0.1}>
      <HoverAnimation hoverClass="hover-lift hover-glow">
        <Card
          ref={cardRef}
          className={getCardClasses()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onClick}
    >
      {/* Image Container */}
      <div className={`relative ${getImageAspect()} overflow-hidden bg-background-secondary`}>
        {/* Main Image with Enhanced Animation */}
        {(poster_url || backdrop_url) ? (
          <img
            src={(variant === 'large' || variant === 'hero') ? (backdrop_url || poster_url) : (poster_url || backdrop_url)}
            alt={title_ar || title}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110 will-change-transform card-image"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            {getTypeIcon(type)}
            <span className="text-sm text-muted-foreground text-center px-2 mt-2">
              {getTypeLabel(type)}
            </span>
          </div>
        )}

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 transition-all duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Main Play Button with Enhanced Animation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Button
              size={variant === 'large' || variant === 'hero' ? 'lg' : 'default'}
              className="bg-primary hover:bg-primary/90 text-white shadow-lg backdrop-blur-sm border border-white/20 transform hover:scale-110 transition-all duration-300 btn-ripple animate-scale-in-bounce"
            >
              <Play className={`${variant === 'large' || variant === 'hero' ? 'h-6 w-6' : 'h-4 w-4'} ml-1`} />
              مشاهدة
            </Button>
          </div>

          {/* Action Buttons with Stagger Animation */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 stagger-children">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/20 rounded-full animate-fade-in-left hover:scale-110 transition-all duration-300"
              onClick={toggleFavorite}
              disabled={isLoading}
              style={{'--index': 0} as React.CSSProperties}
            >
              <Heart className={`h-4 w-4 transition-all duration-300 ${isFavorited ? 'fill-red-500 text-red-500 animate-pulse' : 'hover:scale-125'}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/20 rounded-full animate-fade-in-left hover:scale-110 transition-all duration-300"
              onClick={addToWatchlist}
              disabled={isLoading}
              style={{'--index': 1} as React.CSSProperties}
            >
              {isInWatchlist ? (
                <Check className="h-4 w-4 text-green-500 animate-scale-in-bounce" />
              ) : (
                <Plus className="h-4 w-4 hover:rotate-90 transition-transform duration-300" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/20 rounded-full animate-fade-in-left hover:scale-110 transition-all duration-300"
              onClick={shareContent}
              style={{'--index': 2} as React.CSSProperties}
            >
              <Share2 className="h-4 w-4 hover:rotate-12 transition-transform duration-300" />
            </Button>
          </div>

          {/* Info Button */}
          <div className="absolute bottom-3 left-3">
            <Button
              variant="ghost"
              size="sm"
              className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/content/${id}`);
              }}
            >
              <Info className="h-4 w-4 ml-1" />
              التفاصيل
            </Button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {/* Type Badge */}
          <Badge 
            variant="secondary" 
            className="bg-primary/90 text-white border-none backdrop-blur-sm"
          >
            {getTypeIcon(type)}
            <span className="mr-1">{getTypeLabel(type)}</span>
          </Badge>

          {/* Special Status Badges */}
          {isTrending && (
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-none animate-pulse">
              <TrendingUp className="h-3 w-3 mr-1" />
              رائج
            </Badge>
          )}

          {isNew && (
            <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white border-none">
              جديد
            </Badge>
          )}

          {isPersonalRecommendation && matchScore && (
            <Badge 
              className={`text-white border-none ${
                matchScore >= 90 ? 'bg-green-500' :
                matchScore >= 80 ? 'bg-blue-500' :
                'bg-orange-500'
              }`}
            >
              {matchScore}% توافق
            </Badge>
          )}
        </div>

        {/* Rating & Duration */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-2">
          {rating && rating > 0 && (
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full backdrop-blur-sm">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span className="text-xs text-white font-medium">{rating.toFixed(1)}</span>
            </div>
          )}

          {duration && (
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full backdrop-blur-sm">
              <Clock className="h-3 w-3 text-white" />
              <span className="text-xs text-white">{formatDuration(duration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Info */}
      {variant !== 'minimal' && (
        <div className="p-4 space-y-3">
          {/* Title */}
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

          {/* Description for large variant */}
          {variant === 'large' && description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}

          {/* Meta Information */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{year}</span>
                </div>
              )}
              {rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="font-medium">{rating.toFixed(1)}</span>
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
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {categories.slice(0, variant === 'large' ? 4 : 2).map((category, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-0 border-border text-muted-foreground hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/search?genre=${encodeURIComponent(category)}`);
                  }}
                >
                  {category}
                </Badge>
              ))}
              {categories.length > (variant === 'large' ? 4 : 2) && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-0 border-border text-muted-foreground"
                >
                  +{categories.length - (variant === 'large' ? 4 : 2)}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </Card>
      </HoverAnimation>
    </ScaleIn>
  );
};
