import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Clock, Star, Users, Calendar, Film, Play, SkipBack, SkipForward, Heart, Bookmark, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';


interface StreamingLink {
  id: string;
  streaming_url: string;
  download_url?: string;
  server_name: string;
  quality: string;
  is_active: boolean;
}

interface ContentData {
  id: string;
  title: string;
  content_type: 'movie' | 'series' | 'anime';
  poster_url?: string;
  description?: string;
  release_date?: string;
  rating?: number;
  duration?: number;
  genres?: string[];
}

interface EpisodeData {
  id: string;
  title?: string;
  episode_number: number;
  duration?: number;
  description?: string;
  air_date?: string;
  season_id: string;
  season?: {
    season_number: number;
    content_id: string;
    content?: ContentData;
  };
}

interface WatchPageProps {
  type: 'movie' | 'episode';
}

export default function WatchPage({ type }: WatchPageProps = { type: 'movie' }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [content, setContent] = useState<ContentData | null>(null);
  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeData[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [watchTime, setWatchTime] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (id) {
      if (type === 'episode') {
        fetchEpisodeData(id);
      } else {
        fetchMovieData(id);
      }
      checkUserInteractions();
    }
  }, [id, type, user]);

  const fetchMovieData = async (movieId: string) => {
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', movieId)
        .single();

      if (contentError) throw contentError;
      setContent(contentData);

      const { data: linksData, error: linksError } = await supabase
        .from('streaming_links')
        .select('*')
        .eq('content_id', movieId)
        .eq('is_active', true)
        .order('server_name');

      if (linksError) throw linksError;
      setStreamingLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching movie data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الفيلم',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodeData = async (episodeId: string) => {
    try {
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select(`
          *,
          season:seasons (
            season_number,
            content_id,
            content:content (*)
          )
        `)
        .eq('id', episodeId)
        .single();

      if (episodeError) throw episodeError;
      setEpisode(episodeData);
      setContent(episodeData.season?.content);

      // Fetch all episodes in the same season
      const { data: allEpisodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', episodeData.season_id)
        .order('episode_number');

      setAllEpisodes(allEpisodesData || []);
      const currentIndex = allEpisodesData?.findIndex(ep => ep.id === episodeId) || 0;
      setCurrentEpisodeIndex(currentIndex);

      // Fetch streaming links for this episode
      const { data: linksData, error: linksError } = await supabase
        .from('streaming_links')
        .select('*')
        .eq('episode_id', episodeId)
        .eq('is_active', true)
        .order('server_name');

      if (linksError) throw linksError;
      setStreamingLinks(linksData || []);
    } catch (error) {
      console.error('Error fetching episode data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات الحلقة',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async () => {
    if (!user || !id) return;

    try {
      // Check if user liked this content
      const { data: likeData } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq(type === 'episode' ? 'episode_id' : 'content_id', id)
        .single();

      setIsLiked(!!likeData);

      // Check if user bookmarked this content
      const { data: bookmarkData } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('user_id', user.id)
        .eq(type === 'episode' ? 'episode_id' : 'content_id', id)
        .single();

      setIsBookmarked(!!bookmarkData);
    } catch (error) {
      // Ignore errors for user interactions
    }
  };

  const saveWatchHistory = async (currentTime: number, duration: number) => {
    if (!user || !id) return;

    try {
      const watchData = {
        user_id: user.id,
        watch_time: Math.floor(currentTime),
        total_duration: Math.floor(duration),
        last_watched: new Date().toISOString(),
        completed: currentTime / duration > 0.9,
        ...(type === 'episode' ? { episode_id: id } : { content_id: id })
      };

      await supabase
        .from('watch_history')
        .upsert(watchData);
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
  };

  const handleProgress = (currentTime: number, duration: number) => {
    setWatchTime(currentTime);
    saveWatchHistory(currentTime, duration);
  };

  const handleComplete = () => {
    toast({
      title: 'تمت المشاهدة',
      description: 'تم إنهاء مشاهدة المحتوى ��نجاح',
    });

    // Auto-navigate to next episode if available
    if (type === 'episode' && currentEpisodeIndex < allEpisodes.length - 1) {
      setTimeout(() => {
        navigateEpisode('next');
      }, 3000);
    }
  };

  const navigateEpisode = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentEpisodeIndex - 1)
      : Math.min(allEpisodes.length - 1, currentEpisodeIndex + 1);
    
    if (newIndex !== currentEpisodeIndex && allEpisodes[newIndex]) {
      navigate(`/watch/episode/${allEpisodes[newIndex].id}`);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: 'تسجيل الدخول مطلوب',
        description: 'يجب تسجيل الدخول لإضافة المحتوى للمفضلة',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq(type === 'episode' ? 'episode_id' : 'content_id', id);
        setIsLiked(false);
        toast({ title: 'تم إزالة من المفضلة' });
      } else {
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            ...(type === 'episode' ? { episode_id: id } : { content_id: id })
          });
        setIsLiked(true);
        toast({ title: 'تم إضافة للمفضلة' });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المفضلة',
        variant: 'destructive'
      });
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: 'تسجيل الدخول مطلوب',
        description: 'يجب تسجيل الدخول لإضافة المحتوى لقائمة المشاهدة',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (isBookmarked) {
        await supabase
          .from('user_watchlist')
          .delete()
          .eq('user_id', user.id)
          .eq(type === 'episode' ? 'episode_id' : 'content_id', id);
        setIsBookmarked(false);
        toast({ title: 'تم إزالة من قائمة المشاهدة' });
      } else {
        await supabase
          .from('user_watchlist')
          .insert({
            user_id: user.id,
            ...(type === 'episode' ? { episode_id: id } : { content_id: id })
          });
        setIsBookmarked(true);
        toast({ title: 'تم إضافة لقائمة المشاهدة' });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث قائمة المشاهدة',
        variant: 'destructive'
      });
    }
  };

  const shareContent = async () => {
    const url = window.location.href;
    const title = `${content?.title}${episode ? ` - الحلقة ${episode.episode_number}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: 'تم نسخ الرابط',
        description: 'تم نسخ رابط المحتوى إلى الحافظة'
      });
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}س ${mins}د`;
    }
    return `${mins}د`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">جاري تحميل المشغل...</p>
        </div>
      </div>
    );
  }

  return (

        >
          <ArrowLeft className="h-4 w-4 ml-1" />
          عودة
        </Button>


          </div>
        )}
      </div>

      {/* Content Information and Controls */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                {content?.title}
                {episode && (
                  <span className="block text-xl text-primary mt-1">
                    الحلقة {episode.episode_number}
                    {episode.title && `: ${episode.title}`}
                  </span>
                )}
              </h1>
              
              {episode?.season && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Film className="h-4 w-4" />
                  <span>الموسم {episode.season.season_number}</span>
                </div>
              )}

              {/* Content Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {content?.release_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(content.release_date).getFullYear()}</span>
                  </div>
                )}
                
                {(content?.duration || episode?.duration) && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(content?.duration || episode?.duration || 0)}</span>
                  </div>
                )}
                
                {content?.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current text-yellow-500" />
                    <span>{content.rating ? content.rating.toFixed(1) : 'غير متاح'}</span>
                  </div>
                )}
                
                <Badge variant="secondary" className="capitalize">
                  {content?.content_type}
                </Badge>
              </div>

              {/* Genres */}
              {content?.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {content.genres.map((genre, index) => (
                    <Badge key={index} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}
            </div>


              </Button>
              
              <Button
                onClick={shareContent}
                variant="outline">>>>>>> main
              </Button>
            </div>
          </div>

          <Separator />
        </div>


                </div>
                
                {content?.release_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">سنة الإصدار:</span>
                    <span>{new Date(content.release_date).getFullYear()}</span>
                  </div>
                )}
                
                {type === 'episode' && episode?.season && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الموسم:</span>
                    <span>{episode.season.season_number}</span>
                  </div>
                )}
                
                {(content?.duration || episode?.duration) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المدة:</span>
                    <span>{formatDuration(content?.duration || episode?.duration || 0)}</span>
                  </div>
                )}
                
                {content?.rating && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التقييم:</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                      <span>{content.rating ? content.rating.toFixed(1) : 'غير متاح'}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

      </div>
    </div>
  );
}
