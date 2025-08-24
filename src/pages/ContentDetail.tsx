import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Play, 
  Plus, 
  Share2, 
  Star, 
  Calendar, 
  Clock, 
  Globe, 
  Heart, 
  BookmarkPlus, 
  Eye, 
  Download,
  Users,
  Award,
  TrendingUp,
  Film,
  Tv,
  Zap,
  MessageCircle,
  ThumbsUp,
  Bookmark,
  ExternalLink,
  Info,
  Sparkles
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EpisodeCard } from '@/components/content/EpisodeCard';
import { EnhancedContentCard } from '@/components/content/EnhancedContentCard';

interface ContentData {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  rating: number;
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
}

interface StreamingLink {
  id: string;
  streaming_url: string;
  server_name: string;
  quality: string;
  download_url?: string;
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

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [content, setContent] = useState<ContentData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedContent, setRelatedContent] = useState<ContentData[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [userStats, setUserStats] = useState<UserStats>({
    watchTime: 0,
    isInWatchlist: false,
    isFavorite: false,
    watchedEpisodes: []
  });
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [statsLoading, setStatsLoading] = useState(false);

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
        .maybeSingle();

      if (contentError) throw contentError;
      if (!contentData) {
        throw new Error('Content not found');
      }

      let seasonsData = null;
      let streamingLinksData = null;

      if (contentData.content_type === 'series' || contentData.content_type === 'anime') {
        const { data: seasons } = await supabase
          .from('seasons')
          .select(`
            *,
            episodes (*)
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

      // Increment view count
      await supabase
        .from('content')
        .update({ view_count: (contentData.view_count || 0) + 1 })
        .eq('id', contentId);

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
        .limit(6)
        .order('rating', { ascending: false });

      if (error) throw error;
      setRelatedContent(data || []);
    } catch (error) {
      console.error('Error fetching related content:', error);
    }
  };

  const fetchUserStats = async (contentId: string) => {
    if (!user) return;
    
    setStatsLoading(true);
    try {
      // Check favorites
      const { data: favoriteData } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .single();

      // Check watchlist
      const { data: watchlistData } = await supabase
        .from('user_watchlist')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .single();

      // Get watch history
      const { data: watchData } = await supabase
        .from('watch_history')
        .select('*')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(1)
        .single();

      // Get user rating
      const { data: ratingData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .single();

      setUserStats({
        watchTime: watchData?.watch_time || 0,
        isInWatchlist: !!watchlistData,
        isFavorite: !!favoriteData,
        userRating: ratingData?.rating,
        watchedEpisodes: [], // Will implement this for episodes
        lastWatchedAt: watchData?.last_watched
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة المحتوى للمفضلة'
      });
      return;
    }

    try {
      if (userStats.isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('content_id', id)
          .eq('user_id', user.id);
        
        setUserStats(prev => ({ ...prev, isFavorite: false }));
        toast({ title: 'تم', description: 'تم حذف المحتوى من المفضلة' });
      } else {
        await supabase
          .from('user_favorites')
          .insert({ content_id: id, user_id: user.id });
        
        setUserStats(prev => ({ ...prev, isFavorite: true }));
        toast({ title: 'تم', description: 'تم إضافة المحتوى للمفضلة' });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المفضلة',
        variant: 'destructive'
      });
    }
  };

  const toggleWatchlist = async () => {
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة المحتوى لقائمة المشاهدة'
      });
      return;
    }

    try {
      if (userStats.isInWatchlist) {
        await supabase
          .from('user_watchlist')
          .delete()
          .eq('content_id', id)
          .eq('user_id', user.id);
        
        setUserStats(prev => ({ ...prev, isInWatchlist: false }));
        toast({ title: 'تم', description: 'تم حذف المحتوى من قائمة المشاهدة' });
      } else {
        await supabase
          .from('user_watchlist')
          .insert({ content_id: id, user_id: user.id });
        
        setUserStats(prev => ({ ...prev, isInWatchlist: true }));
        toast({ title: 'تم', description: 'تم إضافة المحتوى لقائمة المشاهدة' });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث قائمة المشاهدة',
        variant: 'destructive'
      });
    }
  };

  const shareContent = async () => {
    const url = window.location.href;
    const title = content?.title;
    
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

  const addReview = async () => {
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة تقييم'
      });
      return;
    }

    if (!newRating && !newComment.trim()) return;

    try {
      await supabase
        .from('reviews')
        .upsert({
          content_id: id,
          user_id: user.id,
          rating: newRating || null,
          comment: newComment.trim() || null
        });

      setNewRating(0);
      setNewComment('');
      fetchReviews(id!);
      fetchUserStats(id!);
      toast({ title: 'تم', description: 'تم إضافة التقييم بنجاح' });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة التقييم',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const validRatings = reviews.filter(r => r.rating).map(r => r.rating!);
    if (validRatings.length === 0) return 0;
    return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="h-4 w-4" />;
      case 'series': return <Tv className="h-4 w-4" />;
      case 'anime': return <Sparkles className="h-4 w-4" />;
      default: return <Film className="h-4 w-4" />;
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 pt-20 px-4">
        <div className="container mx-auto">
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90 pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">المحتوى غير موجود</h1>
          <Link to="/">
            <Button>العودة للصفحة الرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Enhanced Hero Section */}
      <div className="relative h-[70vh] lg:h-[80vh] overflow-hidden">
        {content.backdrop_url && (
          <>
            <img
              src={content.backdrop_url}
              alt={content.title}
              className="w-full h-full object-cover scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </>
        )}
        
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-6 lg:px-8 pb-12">
            <div className="grid lg:grid-cols-3 gap-8 items-end">
              {/* Poster */}
              <div className="flex justify-center lg:justify-start">
                {content.poster_url && (
                  <div className="relative group">
                    <img
                      src={content.poster_url}
                      alt={content.title}
                      className="w-64 h-96 lg:w-72 lg:h-[432px] object-cover rounded-xl shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}
              </div>
              
              {/* Content Info */}
              <div className="lg:col-span-2 space-y-6 text-white">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getContentTypeIcon(content.content_type)}
                      {getContentTypeLabel(content.content_type)}
                    </Badge>
                    {content.is_netflix && (
                      <Badge className="bg-red-600 hover:bg-red-700">
                        Netflix
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-white/30 text-white">
                      {content.language}
                    </Badge>
                  </div>

                  <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-3">
                    {content.title}
                  </h1>
                  
                  {content.title_en && (
                    <p className="text-xl lg:text-2xl text-white/80 font-medium">
                      {content.title_en}
                    </p>
                  )}
                </div>

                {/* Enhanced Meta Information */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{averageRating > 0 ? averageRating.toFixed(1) : content.rating}/10</span>
                  </div>
                  
                  {content.release_date && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(content.release_date).getFullYear()}</span>
                    </div>
                  )}
                  
                  {content.duration && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(content.duration)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    <Eye className="h-4 w-4" />
                    <span>{(content.view_count || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {content.categories?.slice(0, 4).map((category, index) => (
                    <Badge key={index} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                      {category}
                    </Badge>
                  ))}
                  {content.categories && content.categories.length > 4 && (
                    <Badge variant="outline" className="border-white/30 text-white">
                      +{content.categories.length - 4} أخرى
                    </Badge>
                  )}
                </div>

                {/* Description Preview */}
                {content.description && (
                  <p className="text-white/90 leading-relaxed max-w-2xl line-clamp-3 text-lg">
                    {content.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-4">
                  {content.content_type === 'movie' ? (
                    <Link to={`/watch/${content.id}`}>
                      <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8">
                        <Play className="h-5 w-5" />
                        مشاهدة الآن
                      </Button>
                    </Link>
                  ) : (
                    content.seasons?.[0]?.episodes?.[0] && (
                      <Link to={`/watch/episode/${content.seasons[0].episodes[0].id}`}>
                        <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8">
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
                    <Bookmark className={`h-5 w-5 ${userStats.isInWatchlist ? 'fill-current' : ''}`} />
                    {userStats.isInWatchlist ? 'في قائمة المشاهدة' : 'إضافة للقائمة'}
                  </Button>
                  
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={shareContent}
                    className="gap-2 text-white hover:bg-white/10"
                  >
                    <Share2 className="h-5 w-5" />
                    مشاركة
                  </Button>
                  
                  {content.trailer_url && (
                    <Button 
                      size="lg" 
                      variant="ghost" 
                      className="gap-2 text-white hover:bg-white/10"
                      asChild
                    >
                      <a href={content.trailer_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5" />
                        مشاهدة الإعلان
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className="container mx-auto px-4 py-12 space-y-8">
        {/* Stats Row */}
        {user && !statsLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">{reviews.length}</div>
                <div className="text-sm text-muted-foreground">تقييم</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-500/10 to-green-600/10 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{content.view_count || 0}</div>
                <div className="text-sm text-muted-foreground">مشاهدة</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-purple-500/20">
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {averageRating > 0 ? averageRating.toFixed(1) : content.rating}
                </div>
                <div className="text-sm text-muted-foreground">متوسط التقييم</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/20">
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-orange-600">
                  {userStats.userRating || '--'}
                </div>
                <div className="text-sm text-muted-foreground">تقييمك</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-card/50 backdrop-blur-sm p-1 h-12">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              معلومات
            </TabsTrigger>
            {(content.content_type === 'series' || content.content_type === 'anime') && (
              <TabsTrigger value="episodes" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                الحلقات ({content.seasons?.reduce((total, season) => total + (season.episode_count || 0), 0) || 0})
              </TabsTrigger>
            )}
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              التقييمات ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="related" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              محتوى مشابه
            </TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      نبذة عن {content.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-7 text-lg">
                      {content.description || 'لا توجد معلومات متاحة حول هذا المحتوى.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Cast and Crew */}
                {(content.cast || content.director || content.writer) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>فريق العمل</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {content.director && (
                        <div>
                          <div className="font-semibold mb-2">المخرج:</div>
                          <Badge variant="secondary">{content.director}</Badge>
                        </div>
                      )}
                      
                      {content.writer && (
                        <div>
                          <div className="font-semibold mb-2">الكاتب:</div>
                          <Badge variant="secondary">{content.writer}</Badge>
                        </div>
                      )}
                      
                      {content.cast && content.cast.length > 0 && (
                        <div>
                          <div className="font-semibold mb-2">الممثلون:</div>
                          <div className="flex flex-wrap gap-2">
                            {content.cast.slice(0, 6).map((actor, index) => (
                              <Badge key={index} variant="outline">{actor}</Badge>
                            ))}
                            {content.cast.length > 6 && (
                              <Badge variant="outline">+{content.cast.length - 6} آخرين</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات سريعة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">النوع:</span>
                        <Badge variant="secondary" className="capitalize">
                          {getContentTypeLabel(content.content_type)}
                        </Badge>
                      </div>
                      
                      {content.release_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">سنة الإصدار:</span>
                          <span className="font-medium">{new Date(content.release_date).getFullYear()}</span>
                        </div>
                      )}
                      
                      {content.duration && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">المدة:</span>
                          <span className="font-medium">{formatDuration(content.duration)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">التقييم:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">
                            {averageRating > 0 ? averageRating.toFixed(1) : content.rating}/10
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">المشاهدات:</span>
                        <span className="font-medium">{(content.view_count || 0).toLocaleString()}</span>
                      </div>
                      
                      {content.country && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">البلد:</span>
                          <span className="font-medium">{content.country}</span>
                        </div>
                      )}
                      
                      {content.studio && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">الاستوديو:</span>
                          <span className="font-medium">{content.studio}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Available Servers */}
                {content.streaming_links && content.streaming_links.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>الخوادم المتاحة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {content.streaming_links.map((link) => (
                          <div
                            key={link.id}
                            className="flex justify-between items-center p-3 bg-background-secondary rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{link.server_name}</div>
                              <div className="text-sm text-muted-foreground">
                                جودة {link.quality}
                              </div>
                            </div>
                            
                            {link.download_url && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                              >
                                <a
                                  href={link.download_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4 ml-1" />
                                  تحميل
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Episodes Tab */}
          {(content.content_type === 'series' || content.content_type === 'anime') && (
            <TabsContent value="episodes" className="space-y-6">
              {content.seasons && content.seasons.length > 0 && (
                <div>
                  {/* Season Selector */}
                  {content.seasons.length > 1 && (
                    <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                      {content.seasons.map((season) => (
                        <Button
                          key={season.id}
                          variant={selectedSeason === season.season_number ? 'default' : 'outline'}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className="whitespace-nowrap"
                        >
                          الموسم {season.season_number}
                          <Badge variant="secondary" className="mr-2">
                            {season.episode_count} حلقة
                          </Badge>
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Episodes Grid */}
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {content.seasons
                      .find(s => s.season_number === selectedSeason)
                      ?.episodes?.map((episode) => (
                      <EpisodeCard
                        key={episode.id}
                        episode={{
                          id: episode.id,
                          title: episode.title || `الحلقة ${episode.episode_number}`,
                          episode_number: episode.episode_number,
                          duration: episode.duration,
                          description: episode.description,
                          thumbnail_url: episode.thumbnail_url,
                          air_date: episode.air_date,
                          rating: episode.rating,
                          view_count: episode.view_count,
                          isWatched: userStats.watchedEpisodes.includes(episode.id),
                          watchProgress: 0 // This would come from watch history
                        }}
                        variant="detailed"
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>إضافة تقييم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">التقييم:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star * 2)}
                          className="transition-all duration-200 hover:scale-110"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star * 2 <= newRating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({newRating}/10)
                    </span>
                  </div>
                  
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقك هنا..."
                    className="min-h-[100px]"
                  />
                  
                  <Button 
                    onClick={addReview} 
                    disabled={!newRating && !newComment.trim()}
                    className="w-full"
                  >
                    إضافة التقييم
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={review.profiles?.avatar_url} />
                          <AvatarFallback>
                            {review.profiles?.full_name?.charAt(0) || 'م'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {review.profiles?.full_name || 'مستخدم'}
                              </span>
                              {review.rating && (
                                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-full">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-sm font-medium">{review.rating}/10</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ar')}
                            </span>
                          </div>
                          
                          {review.comment && (
                            <p className="text-muted-foreground leading-relaxed">
                              {review.comment}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 pt-2">
                            <Button variant="ghost" size="sm" className="gap-1">
                              <ThumbsUp className="h-3 w-3" />
                              مفيد ({review.helpful_count || 0})
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
                    <p className="text-sm text-muted-foreground mt-2">كن أول من يقيم هذا المحتوى!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Related Content Tab */}
          <TabsContent value="related" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  محتوى مشابه قد يعجبك
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relatedContent.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {relatedContent.map((item) => (
                      <EnhancedContentCard
                        key={item.id}
                        content={{
                          id: item.id,
                          title: item.title,
                          poster_url: item.poster_url,
                          rating: item.rating,
                          content_type: item.content_type,
                          release_date: item.release_date,
                          duration: item.duration,
                          view_count: item.view_count,
                          categories: item.categories
                        }}
                        variant="compact"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">لا يوجد محتوى مشابه متاح حالياً</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
