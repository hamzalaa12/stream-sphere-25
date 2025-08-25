import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Play, 
  Download, 
  Heart, 
  BookmarkPlus, 
  Share2, 
  Star, 
  Calendar, 
  Clock, 
  Eye, 
  Globe,
  Film,
  Tv,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  Award,
  Info,
  PlayCircle,
  DownloadIcon,
  Server,
  Zap,
  ArrowLeft,
  Grid3X3,
  List,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/ui/responsive-container';
import { FadeInUp, ScaleIn, StaggerContainer } from '@/components/ui/animated-component';

interface ContentData {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  rating?: number;
  release_date?: string;
  duration?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  language: string;
  country?: string;
  view_count: number;
  is_netflix: boolean;
  seasons?: Season[];
  streaming_links?: StreamingLink[];
  cast?: string[];
  director?: string;
  writer?: string;
  studio?: string;
  imdb_id?: string;
  tmdb_id?: string;
}

interface Season {
  id: string;
  season_number: number;
  title?: string;
  description?: string;
  episode_count: number;
  air_date?: string;
  poster_url?: string;
  episodes?: Episode[];
}

interface Episode {
  id: string;
  episode_number: number;
  title?: string;
  description?: string;
  duration?: number;
  thumbnail_url?: string;
  air_date?: string;
  rating?: number;
  view_count?: number;
  streaming_links?: StreamingLink[];
  download_links?: DownloadLink[];
}

interface StreamingLink {
  id: string;
  streaming_url: string;
  server_name: string;
  quality: string;
  is_active: boolean;
}

interface DownloadLink {
  id: string;
  download_url: string;
  server_name: string;
  quality: string;
  file_size?: string;
}

interface Review {
  id: string;
  user_id: string;
  rating?: number;
  comment?: string;
  created_at: string;
  helpful_count?: number;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface UserStats {
  watchTime: number;
  isInWatchlist: boolean;
  isFavorite: boolean;
  userRating?: number;
  watchedEpisodes: string[];
  lastWatchedAt?: string;
}

export default function EnhancedContentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [content, setContent] = useState<ContentData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedContent, setRelatedContent] = useState<ContentData[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    watchTime: 0,
    isInWatchlist: false,
    isFavorite: false,
    watchedEpisodes: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'list'>('grid');
  const [episodeFilter, setEpisodeFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  useEffect(() => {
    if (id) {
      fetchContentDetails(id);
      fetchReviews(id);
      fetchRelatedContent(id);
      if (user) {
        fetchUserStats(id);
      }
    }
  }, [id, user]);

  const fetchContentDetails = async (contentId: string) => {
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (contentError) throw contentError;
      if (!contentData) throw new Error('Content not found');

      let seasonsData = null;
      let streamingLinksData = null;

      if (contentData.content_type === 'series' || contentData.content_type === 'anime') {
        const { data: seasons } = await supabase
          .from('seasons')
          .select(`
            *,
            episodes (
              *,
              streaming_links(*),
              download_links(*)
            )
          `)
          .eq('content_id', contentId)
          .order('season_number');
        seasonsData = seasons;
      } else {
        const { data: links } = await supabase
          .from('streaming_links')
          .select('*')
          .eq('content_id', contentId)
          .eq('is_active', true);
        streamingLinksData = links;
      }

      setContent({
        ...contentData,
        seasons: seasonsData,
        streaming_links: streamingLinksData
      });

      // Set default selected season
      if (seasonsData && seasonsData.length > 0) {
        setSelectedSeason(seasonsData[0].season_number);
      }

    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchRelatedContent = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .neq('id', contentId)
        .eq('content_type', content?.content_type)
        .limit(8)
        .order('rating', { ascending: false });

      if (error) throw error;
      setRelatedContent(data || []);
    } catch (error) {
      console.error('Error fetching related content:', error);
    }
  };

  const fetchUserStats = async (contentId: string) => {
    if (!user) return;
    
    try {
      const [favoriteData, watchlistData, watchData, ratingData] = await Promise.all([
        supabase.from('user_favorites').select('id').eq('content_id', contentId).eq('user_id', user.id).single(),
        supabase.from('user_watchlist').select('id').eq('content_id', contentId).eq('user_id', user.id).single(),
        supabase.from('watch_history').select('*').eq('content_id', contentId).eq('user_id', user.id).order('last_watched', { ascending: false }).limit(1).single(),
        supabase.from('reviews').select('rating').eq('content_id', contentId).eq('user_id', user.id).single()
      ]);

      setUserStats({
        watchTime: watchData.data?.watch_time || 0,
        isInWatchlist: !!watchlistData.data,
        isFavorite: !!favoriteData.data,
        userRating: ratingData.data?.rating,
        watchedEpisodes: [],
        lastWatchedAt: watchData.data?.last_watched
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: 'تسجيل الدخول مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (userStats.isFavorite) {
        await supabase.from('user_favorites').delete().eq('content_id', id).eq('user_id', user.id);
        setUserStats(prev => ({ ...prev, isFavorite: false }));
        toast({ title: 'تم حذف من المفضلة' });
      } else {
        await supabase.from('user_favorites').insert({ content_id: id, user_id: user.id });
        setUserStats(prev => ({ ...prev, isFavorite: true }));
        toast({ title: 'تم إضافة للمفضلة' });
      }
    } catch (error) {
      toast({ title: 'خطأ في تحديث المفضلة', variant: 'destructive' });
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast({ title: 'تسجيل الدخول مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (userStats.isInWatchlist) {
        await supabase.from('user_watchlist').delete().eq('content_id', id).eq('user_id', user.id);
        setUserStats(prev => ({ ...prev, isInWatchlist: false }));
        toast({ title: 'تم حذف من قائمة المشاهدة' });
      } else {
        await supabase.from('user_watchlist').insert({ content_id: id, user_id: user.id });
        setUserStats(prev => ({ ...prev, isInWatchlist: true }));
        toast({ title: 'تم إضافة لقائمة المشاهدة' });
      }
    } catch (error) {
      toast({ title: 'خطأ في تحديث قائمة المشاهدة', variant: 'destructive' });
    }
  };

  const getCurrentSeason = () => {
    return content?.seasons?.find(season => season.season_number === selectedSeason);
  };

  const getFilteredEpisodes = () => {
    const currentSeason = getCurrentSeason();
    if (!currentSeason?.episodes) return [];

    return currentSeason.episodes.filter(episode => {
      const matchesFilter = episodeFilter === '' || 
        episode.title?.toLowerCase().includes(episodeFilter.toLowerCase()) ||
        episode.episode_number.toString().includes(episodeFilter);
      
      return matchesFilter;
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="h-5 w-5" />;
      case 'series': return <Tv className="h-5 w-5" />;
      case 'anime': return <Sparkles className="h-5 w-5" />;
      default: return <Film className="h-5 w-5" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'فيلم';
      case 'series': return 'مسلسل';
      case 'anime': return 'أنمي';
      default: return 'محتوى';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">المحتوى غير موجود</h1>
          <Button onClick={() => navigate('/')}>العودة للصفحة الرئيسية</Button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.filter(r => r.rating).reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.filter(r => r.rating).length
    : content.rating || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Enhanced Hero Section */}
      <div className="relative h-[85vh] overflow-hidden">
        {content.backdrop_url && (
          <>
            <img
              src={content.backdrop_url}
              alt={content.title}
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </>
        )}
        
        {/* Back Button */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="absolute top-6 left-6 text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm z-10"
        >
          <ArrowLeft className="h-4 w-4 ml-1" />
          عودة
        </Button>

        <div className="absolute inset-0 flex items-end">
          <ResponsiveContainer className="pb-12">
            <div className="grid lg:grid-cols-5 gap-8 items-end">
              {/* Poster */}
              <div className="lg:col-span-1">
                <FadeInUp delay={200}>
                  <div className="relative group">
                    <img
                      src={content.poster_url || content.backdrop_url}
                      alt={content.title}
                      className="w-full max-w-sm mx-auto lg:max-w-none h-auto lg:h-96 object-cover rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </FadeInUp>
              </div>
              
              {/* Content Info */}
              <div className="lg:col-span-4 space-y-6 text-white">
                <FadeInUp delay={400}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge variant="secondary" className="flex items-center gap-2 bg-primary/20 text-white border-primary/30">
                        {getContentTypeIcon(content.content_type)}
                        {getContentTypeLabel(content.content_type)}
                      </Badge>
                      {content.is_netflix && (
                        <Badge className="bg-red-600 hover:bg-red-700">Netflix</Badge>
                      )}
                      <Badge variant="outline" className="border-white/30 text-white">
                        {content.language}
                      </Badge>
                    </div>

                    <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                      {content.title}
                    </h1>
                    
                    {content.title_en && content.title_en !== content.title && (
                      <p className="text-xl lg:text-2xl text-white/80 font-medium">
                        {content.title_en}
                      </p>
                    )}
                  </div>
                </FadeInUp>

                {/* Meta Information */}
                <FadeInUp delay={600}>
                  <div className="flex flex-wrap items-center gap-6 text-lg">
                    {averageRating > 0 && (
                      <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{averageRating.toFixed(1)}/10</span>
                      </div>
                    )}
                    
                    {content.release_date && (
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                        <Calendar className="h-5 w-5" />
                        <span>{new Date(content.release_date).getFullYear()}</span>
                      </div>
                    )}
                    
                    {content.duration && (
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                        <Clock className="h-5 w-5" />
                        <span>{formatDuration(content.duration)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                      <Eye className="h-5 w-5" />
                      <span>{content.view_count.toLocaleString()}</span>
                    </div>
                  </div>
                </FadeInUp>

                {/* Description */}
                <FadeInUp delay={800}>
                  {content.description && (
                    <p className="text-white/90 leading-relaxed max-w-4xl text-lg line-clamp-3">
                      {content.description}
                    </p>
                  )}
                </FadeInUp>

                {/* Action Buttons */}
                <FadeInUp delay={1000}>
                  <div className="flex flex-wrap gap-4">
                    {content.content_type === 'movie' ? (
                      <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 px-8">
                        <Play className="h-5 w-5" />
                        مشاهدة الآن
                      </Button>
                    ) : (
                      content.seasons?.[0]?.episodes?.[0] && (
                        <Link to={`/watch/episode/${content.seasons[0].episodes[0].id}`}>
                          <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 px-8">
                            <Play className="h-5 w-5" />
                            بدء المشاهدة
                          </Button>
                        </Link>
                      )
                    )}
                    
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={toggleFavorite}
                      className="gap-2 border-white/30 text-white hover:bg-white/10"
                    >
                      <Heart className={`h-5 w-5 ${userStats.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                      {userStats.isFavorite ? 'من المفضلة' : 'إضافة للمفضلة'}
                    </Button>
                    
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={toggleWatchlist}
                      className="gap-2 border-white/30 text-white hover:bg-white/10"
                    >
                      <BookmarkPlus className={`h-5 w-5 ${userStats.isInWatchlist ? 'fill-current' : ''}`} />
                      {userStats.isInWatchlist ? 'في قائمة المشاهدة' : 'إضافة للقائمة'}
                    </Button>

                    {content.trailer_url && (
                      <Button 
                        size="lg" 
                        variant="ghost" 
                        className="gap-2 text-white hover:bg-white/10"
                        asChild
                      >
                        <a href={content.trailer_url} target="_blank" rel="noopener noreferrer">
                          <PlayCircle className="h-5 w-5" />
                          مشاهدة الإعلان
                        </a>
                      </Button>
                    )}
                  </div>
                </FadeInUp>
              </div>
            </div>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Tabs */}
      <ResponsiveContainer className="py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-card/50 backdrop-blur-sm p-1 h-14 w-full lg:w-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              نظرة عامة
            </TabsTrigger>
            {(content.content_type === 'series' || content.content_type === 'anime') && (
              <>
                <TabsTrigger value="seasons" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  المواسم ({content.seasons?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="episodes" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  الحلقات
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="related" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              محتوى مشابه
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات تفصيلية</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {content.description && (
                      <div>
                        <h4 className="font-semibold mb-2">الوصف:</h4>
                        <p className="text-muted-foreground leading-7">{content.description}</p>
                      </div>
                    )}

                    {(content.cast || content.director || content.writer) && (
                      <div className="space-y-4">
                        <h4 className="font-semibold">فريق العمل:</h4>
                        
                        {content.director && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground min-w-20">المخرج:</span>
                            <Badge variant="secondary">{content.director}</Badge>
                          </div>
                        )}
                        
                        {content.writer && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground min-w-20">الكاتب:</span>
                            <Badge variant="secondary">{content.writer}</Badge>
                          </div>
                        )}
                        
                        {content.cast && content.cast.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-2">الممثلون:</span>
                            <div className="flex flex-wrap gap-2">
                              {content.cast.slice(0, 8).map((actor, index) => (
                                <Badge key={index} variant="outline">{actor}</Badge>
                              ))}
                              {content.cast.length > 8 && (
                                <Badge variant="outline">+{content.cast.length - 8} آخرين</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {content.categories && content.categories.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">التصنيفات:</h4>
                        <div className="flex flex-wrap gap-2">
                          {content.categories.map((category, index) => (
                            <Badge key={index} variant="outline" className="cursor-pointer hover:bg-primary/10">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">النوع:</span>
                        <Badge variant="secondary">{getContentTypeLabel(content.content_type)}</Badge>
                      </div>
                      
                      {content.release_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">سنة الإصدار:</span>
                          <span className="font-medium">{new Date(content.release_date).getFullYear()}</span>
                        </div>
                      )}
                      
                      {content.duration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المدة:</span>
                          <span className="font-medium">{formatDuration(content.duration)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">التقييم:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{averageRating.toFixed(1)}/10</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">المشاهدات:</span>
                        <span className="font-medium">{content.view_count.toLocaleString()}</span>
                      </div>
                      
                      {content.country && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">البلد:</span>
                          <span className="font-medium">{content.country}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">اللغة:</span>
                        <span className="font-medium">{content.language}</span>
                      </div>

                      {(content.content_type === 'series' || content.content_type === 'anime') && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">المواسم:</span>
                            <span className="font-medium">{content.seasons?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الحلقات:</span>
                            <span className="font-medium">
                              {content.seasons?.reduce((total, season) => total + (season.episode_count || 0), 0) || 0}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Streaming Links for Movies */}
                {content.content_type === 'movie' && content.streaming_links && content.streaming_links.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>روابط المشاهدة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {content.streaming_links.map((link) => (
                          <div key={link.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div>
                              <div className="font-medium">{link.server_name}</div>
                              <div className="text-sm text-muted-foreground">جودة {link.quality}</div>
                            </div>
                            <Button size="sm" asChild>
                              <Link to={`/watch/${content.id}`}>
                                <Play className="h-4 w-4 ml-1" />
                                مشاهدة
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Seasons Tab */}
          {(content.content_type === 'series' || content.content_type === 'anime') && (
            <TabsContent value="seasons" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    المواسم ({content.seasons?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveGrid type="categories" className="gap-6">
                    {content.seasons?.map((season) => (
                      <ScaleIn key={season.id} triggerOnScroll>
                        <Card 
                          className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                            selectedSeason === season.season_number ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => {
                            setSelectedSeason(season.season_number);
                            setActiveTab('episodes');
                          }}
                        >
                          <CardContent className="p-6">
                            <div className="space-y-4">
                              {season.poster_url && (
                                <img 
                                  src={season.poster_url} 
                                  alt={`الموسم ${season.season_number}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              )}
                              
                              <div>
                                <h3 className="font-bold text-lg">
                                  الموسم {season.season_number}
                                </h3>
                                {season.title && (
                                  <p className="text-sm text-muted-foreground">{season.title}</p>
                                )}
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">الحلقات:</span>
                                  <span className="font-medium">{season.episode_count}</span>
                                </div>
                                {season.air_date && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">تاريخ البث:</span>
                                    <span className="font-medium">
                                      {new Date(season.air_date).getFullYear()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {season.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {season.description}
                                </p>
                              )}

                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSeason(season.season_number);
                                    setActiveTab('episodes');
                                  }}
                                >
                                  عرض الحلقات
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </ScaleIn>
                    ))}
                  </ResponsiveGrid>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Episodes Tab */}
          {(content.content_type === 'series' || content.content_type === 'anime') && (
            <TabsContent value="episodes" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      حلقات الموسم {selectedSeason}
                    </CardTitle>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                      {/* Season Selector */}
                      {content.seasons && content.seasons.length > 1 && (
                        <Select 
                          value={selectedSeason.toString()} 
                          onValueChange={(value) => setSelectedSeason(parseInt(value))}
                        >
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {content.seasons.map((season) => (
                              <SelectItem key={season.id} value={season.season_number.toString()}>
                                الموسم {season.season_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {/* Search Episodes */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="البحث في الحلقات..."
                          value={episodeFilter}
                          onChange={(e) => setEpisodeFilter(e.target.value)}
                          className="pl-10 w-full sm:w-60"
                        />
                      </div>
                      
                      {/* View Mode Toggle */}
                      <div className="flex border rounded-lg overflow-hidden">
                        <Button
                          variant={episodeViewMode === 'grid' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setEpisodeViewMode('grid')}
                          className="rounded-none"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={episodeViewMode === 'list' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setEpisodeViewMode('list')}
                          className="rounded-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`${episodeViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}`}>
                    {getFilteredEpisodes().map((episode) => (
                      <ScaleIn key={episode.id} triggerOnScroll>
                        <Card className="hover:shadow-lg transition-all duration-300 group">
                          <CardContent className={`${episodeViewMode === 'grid' ? 'p-0' : 'p-4'}`}>
                            {episodeViewMode === 'grid' ? (
                              <div className="space-y-4">
                                {/* Episode Thumbnail */}
                                <div className="relative overflow-hidden rounded-t-lg">
                                  <img
                                    src={episode.thumbnail_url || content.backdrop_url || '/placeholder.svg'}
                                    alt={episode.title || `الحلقة ${episode.episode_number}`}
                                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                    <div className="flex gap-2">
                                      <Button size="sm" asChild>
                                        <Link to={`/watch/episode/${episode.id}`}>
                                          <Play className="h-4 w-4 ml-1" />
                                          شاهد الآن
                                        </Link>
                                      </Button>
                                      {episode.download_links && episode.download_links.length > 0 && (
                                        <Button size="sm" variant="outline" className="text-white border-white/30">
                                          <Download className="h-4 w-4 ml-1" />
                                          تحميل
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  <Badge className="absolute top-2 right-2 bg-primary">
                                    الحلقة {episode.episode_number}
                                  </Badge>
                                </div>
                                
                                <div className="p-4 space-y-3">
                                  <div>
                                    <h3 className="font-semibold line-clamp-1">
                                      الحلقة {episode.episode_number}
                                      {episode.title && `: ${episode.title}`}
                                    </h3>
                                    {episode.description && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                        {episode.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                                    {episode.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDuration(episode.duration)}
                                      </span>
                                    )}
                                    {episode.air_date && (
                                      <span>{new Date(episode.air_date).toLocaleDateString('ar')}</span>
                                    )}
                                  </div>

                                  <div className="flex gap-2">
                                    <Button size="sm" className="flex-1" asChild>
                                      <Link to={`/watch/episode/${episode.id}`}>
                                        <PlayCircle className="h-4 w-4 ml-1" />
                                        شاهد الآن
                                      </Link>
                                    </Button>
                                    {episode.download_links && episode.download_links.length > 0 && (
                                      <Button size="sm" variant="outline" className="flex-1">
                                        <DownloadIcon className="h-4 w-4 ml-1" />
                                        تحميل الآن
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-4">
                                <img
                                  src={episode.thumbnail_url || content.backdrop_url || '/placeholder.svg'}
                                  alt={episode.title || `الحلقة ${episode.episode_number}`}
                                  className="w-32 h-20 object-cover rounded"
                                />
                                <div className="flex-1 space-y-2">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-semibold">
                                      الحلقة {episode.episode_number}
                                      {episode.title && `: ${episode.title}`}
                                    </h3>
                                    <div className="flex gap-2">
                                      <Button size="sm" asChild>
                                        <Link to={`/watch/episode/${episode.id}`}>
                                          <PlayCircle className="h-4 w-4 ml-1" />
                                          شاهد الآن
                                        </Link>
                                      </Button>
                                      {episode.download_links && episode.download_links.length > 0 && (
                                        <Button size="sm" variant="outline">
                                          <DownloadIcon className="h-4 w-4 ml-1" />
                                          تحميل الآن
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                  {episode.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {episode.description}
                                    </p>
                                  )}
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    {episode.duration && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDuration(episode.duration)}
                                      </span>
                                    )}
                                    {episode.air_date && (
                                      <span>{new Date(episode.air_date).toLocaleDateString('ar')}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </ScaleIn>
                    ))}
                  </div>
                  
                  {getFilteredEpisodes().length === 0 && (
                    <div className="text-center py-12">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">لا توجد حلقات تطابق البحث</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Related Content Tab */}
          <TabsContent value="related" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {getContentTypeLabel(content.content_type)} مشابه
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relatedContent.length > 0 ? (
                  <ResponsiveGrid type="content" className="gap-6">
                    {relatedContent.map((item) => (
                      <ScaleIn key={item.id} triggerOnScroll>
                        <Link to={`/content/${item.id}`}>
                          <Card className="hover:shadow-lg transition-all duration-300 group overflow-hidden">
                            <div className="relative">
                              <img
                                src={item.poster_url || '/placeholder.svg'}
                                alt={item.title}
                                className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <Button size="sm">
                                  <Info className="h-4 w-4 ml-1" />
                                  التفاصيل
                                </Button>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold line-clamp-1">{item.title}</h3>
                              <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                                <span>{item.release_date ? new Date(item.release_date).getFullYear() : ''}</span>
                                {item.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{item.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </ScaleIn>
                    ))}
                  </ResponsiveGrid>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا يوجد محتوى مشابه متاح</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </ResponsiveContainer>
    </div>
  );
}
