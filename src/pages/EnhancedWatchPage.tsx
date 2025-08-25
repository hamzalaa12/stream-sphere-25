import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft, 
  Settings, 
  SkipBack, 
  SkipForward, 
  Download,
  Server,
  Grid3X3,
  List,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Share2,
  Heart,
  Bookmark,
  Info,
  Star,
  Clock,
  Calendar,
  Eye,
  Film,
  Tv,
  Sparkles,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AdvancedVideoPlayer } from '@/components/player/AdvancedVideoPlayer';
import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { FadeInUp, ScaleIn } from '@/components/ui/animated-component';

interface StreamingServer {
  id: string;
  name: string;
  streaming_links: StreamingLink[];
  download_links: DownloadLink[];
  is_premium: boolean;
  speed_rating: number;
}

interface StreamingLink {
  id: string;
  streaming_url: string;
  quality: string;
  server_id: string;
  is_active: boolean;
}

interface DownloadLink {
  id: string;
  download_url: string;
  quality: string;
  file_size: string;
  server_id: string;
  is_active: boolean;
}

interface ContentData {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  release_date?: string;
  duration?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  language: string;
  view_count: number;
  seasons?: Season[];
}

interface Season {
  id: string;
  season_number: number;
  title?: string;
  episode_count: number;
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
  season_id: string;
  season?: {
    season_number: number;
    content_id: string;
    content?: ContentData;
  };
}

interface WatchPageProps {
  type?: 'movie' | 'episode';
}

export default function EnhancedWatchPage({ type }: WatchPageProps = { type: 'movie' }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Main State
  const [content, setContent] = useState<ContentData | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  
  // Server and Quality State
  const [servers, setServers] = useState<StreamingServer[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [downloadServers, setDownloadServers] = useState<StreamingServer[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'list'>('list');
  const [autoPlay, setAutoPlay] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (id) {
      if (type === 'episode') {
        fetchEpisodeData(id);
      } else {
        fetchMovieData(id);
      }
      if (user) {
        checkUserInteractions();
      }
    }
  }, [id, type, user]);

  const fetchMovieData = async (movieId: string) => {
    try {
      setLoading(true);
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', movieId)
        .single();

      if (contentError) throw contentError;
      setContent(contentData);

      await fetchServersForContent(movieId);
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
      setLoading(true);
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select(`
          *,
          season:seasons (
            *,
            content:content (*)
          )
        `)
        .eq('id', episodeId)
        .single();

      if (episodeError) throw episodeError;
      setEpisode(episodeData);
      setContent(episodeData.season?.content);

      // Fetch all seasons for this content
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select(`
          *,
          episodes (*)
        `)
        .eq('content_id', episodeData.season?.content_id)
        .order('season_number');

      setAllSeasons(seasonsData || []);

      // Fetch all episodes for current season
      const { data: episodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', episodeData.season_id)
        .order('episode_number');

      setAllEpisodes(episodesData || []);
      const currentIndex = episodesData?.findIndex(ep => ep.id === episodeId) || 0;
      setCurrentEpisodeIndex(currentIndex);
      setSelectedSeason(episodeData.season?.season_number || 1);

      await fetchServersForEpisode(episodeId);
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

  const fetchServersForContent = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('streaming_links')
        .select(`
          *,
          internal_servers (
            id,
            name,
            is_premium,
            speed_rating
          ),
          download_links (*)
        `)
        .eq('content_id', contentId)
        .eq('is_active', true);

      if (error) throw error;
      processServersData(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const fetchServersForEpisode = async (episodeId: string) => {
    try {
      const { data, error } = await supabase
        .from('streaming_links')
        .select(`
          *,
          internal_servers (
            id,
            name,
            is_premium,
            speed_rating
          ),
          download_links (*)
        `)
        .eq('episode_id', episodeId)
        .eq('is_active', true);

      if (error) throw error;
      processServersData(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const processServersData = (data: any[]) => {
    const serverMap = new Map<string, StreamingServer>();

    data.forEach(link => {
      const serverId = link.internal_servers?.id || 'unknown';
      const serverName = link.internal_servers?.name || 'خادم غير معروف';

      if (!serverMap.has(serverId)) {
        serverMap.set(serverId, {
          id: serverId,
          name: serverName,
          streaming_links: [],
          download_links: [],
          is_premium: link.internal_servers?.is_premium || false,
          speed_rating: link.internal_servers?.speed_rating || 1
        });
      }

      const server = serverMap.get(serverId)!;
      server.streaming_links.push({
        id: link.id,
        streaming_url: link.streaming_url,
        quality: link.quality,
        server_id: serverId,
        is_active: link.is_active
      });

      if (link.download_links) {
        server.download_links.push(...link.download_links);
      }
    });

    const serversArray = Array.from(serverMap.values());
    const streamingServers = serversArray.filter(s => s.streaming_links.length > 0);
    const downloadServers = serversArray.filter(s => s.download_links.length > 0);

    setServers(streamingServers);
    setDownloadServers(downloadServers);

    // Set default server and quality
    if (streamingServers.length > 0) {
      setSelectedServer(streamingServers[0].id);
      if (streamingServers[0].streaming_links.length > 0) {
        setSelectedQuality(streamingServers[0].streaming_links[0].quality);
      }
    }
  };

  const checkUserInteractions = async () => {
    if (!user || !id) return;

    try {
      const [likeData, bookmarkData] = await Promise.all([
        supabase.from('user_favorites').select('id').eq('user_id', user.id).eq(type === 'episode' ? 'episode_id' : 'content_id', id).single(),
        supabase.from('user_watchlist').select('id').eq('user_id', user.id).eq(type === 'episode' ? 'episode_id' : 'content_id', id).single()
      ]);

      setIsLiked(!!likeData.data);
      setIsBookmarked(!!bookmarkData.data);
    } catch (error) {
      // Ignore errors for user interactions
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

  const navigateToSeason = async (seasonNumber: number) => {
    try {
      const season = allSeasons.find(s => s.season_number === seasonNumber);
      if (!season) return;

      const { data: episodesData } = await supabase
        .from('episodes')
        .select('*')
        .eq('season_id', season.id)
        .order('episode_number')
        .limit(1);

      if (episodesData && episodesData.length > 0) {
        navigate(`/watch/episode/${episodesData[0].id}`);
      }
    } catch (error) {
      console.error('Error navigating to season:', error);
    }
  };

  const getCurrentStreamingLink = () => {
    const server = servers.find(s => s.id === selectedServer);
    return server?.streaming_links.find(link => link.quality === selectedQuality);
  };

  const toggleLike = async () => {
    if (!user) {
      toast({ title: 'تسجيل الدخول مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (isLiked) {
        await supabase.from('user_favorites').delete().eq('user_id', user.id).eq(type === 'episode' ? 'episode_id' : 'content_id', id);
        setIsLiked(false);
        toast({ title: 'تم إزالة من المفضلة' });
      } else {
        await supabase.from('user_favorites').insert({
          user_id: user.id,
          ...(type === 'episode' ? { episode_id: id } : { content_id: id })
        });
        setIsLiked(true);
        toast({ title: 'تم إضافة للمفضلة' });
      }
    } catch (error) {
      toast({ title: 'خطأ في تحديث المفضلة', variant: 'destructive' });
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({ title: 'تسجيل الدخول مطلوب', variant: 'destructive' });
      return;
    }

    try {
      if (isBookmarked) {
        await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq(type === 'episode' ? 'episode_id' : 'content_id', id);
        setIsBookmarked(false);
        toast({ title: 'تم إزالة من قائمة المشاهدة' });
      } else {
        await supabase.from('user_watchlist').insert({
          user_id: user.id,
          ...(type === 'episode' ? { episode_id: id } : { content_id: id })
        });
        setIsBookmarked(true);
        toast({ title: 'تم إضافة لقائمة المشاهدة' });
      }
    } catch (error) {
      toast({ title: 'خ��أ في تحديث قائمة المشاهدة', variant: 'destructive' });
    }
  };

  const shareContent = async () => {
    const url = window.location.href;
    const title = `${content?.title}${episode ? ` - الحلقة ${episode.episode_number}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'تم نسخ الرابط', description: 'تم نسخ رابط المحتوى إلى الحافظة' });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="h-4 w-4" />;
      case 'series': return <Tv className="h-4 w-4" />;
      case 'anime': return <Sparkles className="h-4 w-4" />;
      default: return <Film className="h-4 w-4" />;
    }
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

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">المحتوى غير موجود</h1>
          <Button onClick={() => navigate('/')}>العودة للصفحة الرئيسية</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      {/* Enhanced Video Player */}
      <div className="relative bg-black">
        <AdvancedVideoPlayer
          contentId={type === 'movie' ? id : undefined}
          episodeId={type === 'episode' ? id : undefined}
          poster={content?.poster_url}
          autoPlay={autoPlay}
        />

        {/* Enhanced Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
          <div className="flex gap-2">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              className="text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 ml-1" />
              عودة
            </Button>
            
            <Button
              onClick={() => navigate(`/content/${content.id}`)}
              variant="ghost"
              size="sm"
              className="text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <Info className="h-4 w-4 ml-1" />
              معلومات
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={toggleLike}
              variant="ghost"
              size="sm"
              className="text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            
            <Button
              onClick={toggleBookmark}
              variant="ghost"
              size="sm"
              className="text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            
            <Button
              onClick={shareContent}
              variant="ghost"
              size="sm"
              className="text-white bg-black/50 hover:bg-black/70 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Episode Navigation for Series/Anime */}
        {type === 'episode' && allEpisodes.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-4 bg-black/70 backdrop-blur-sm rounded-full px-6 py-3">
              <Button
                onClick={() => navigateEpisode('prev')}
                disabled={currentEpisodeIndex === 0}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <span className="text-white text-sm font-medium px-4">
                الحلقة {episode?.episode_number} من {allEpisodes.length}
              </span>
              
              <Button
                onClick={() => navigateEpisode('next')}
                disabled={currentEpisodeIndex === allEpisodes.length - 1}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 rounded-full"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content Information and Controls */}
      <ResponsiveContainer className="py-8 space-y-8">
        {/* Title and Meta Information */}
        <FadeInUp>
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {getContentTypeIcon(content.content_type)}
                    {content.content_type === 'movie' ? 'فيلم' : content.content_type === 'series' ? 'مسلسل' : 'أنمي'}
                  </Badge>
                  {content.language && (
                    <Badge variant="outline">{content.language}</Badge>
                  )}
                </div>
                
                <h1 className="text-2xl lg:text-4xl font-bold">
                  {content.title}
                  {episode && (
                    <span className="block text-lg text-primary mt-1">
                      الحلقة {episode.episode_number}
                      {episode.title && `: ${episode.title}`}
                    </span>
                  )}
                </h1>

                {episode?.season && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tv className="h-4 w-4" />
                    <span>الموسم {episode.season.season_number}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={toggleLike} variant={isLiked ? "default" : "outline"} size="sm">
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                  {isLiked ? 'مُعجب' : 'إعجاب'}
                </Button>
                
                <Button onClick={toggleBookmark} variant={isBookmarked ? "default" : "outline"} size="sm">
                  <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked ? 'محفوظ' : 'حفظ'}
                </Button>
                
                <Button onClick={shareContent} variant="outline" size="sm">
                  <Share2 className="h-4 w-4" />
                  مشاركة
                </Button>
              </div>
            </div>

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {content.release_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(content.release_date).getFullYear()}</span>
                </div>
              )}
              
              {(content.duration || episode?.duration) && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(content.duration || episode?.duration)}</span>
                </div>
              )}
              
              {content.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current text-yellow-500" />
                  <span>{content.rating ? content.rating.toFixed(1) : 'غير متاح'}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{content.view_count.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </FadeInUp>

        {/* Enhanced Controls Section */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Server Selection */}
          <div className="lg:col-span-2 space-y-6">
            <FadeInUp delay={200}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    خوادم المشاهدة ({servers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">اختر الخادم:</label>
                      <Select value={selectedServer} onValueChange={setSelectedServer}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر خادم المشاهدة" />
                        </SelectTrigger>
                        <SelectContent>
                          {servers.map((server) => (
                            <SelectItem key={server.id} value={server.id}>
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4" />
                                <span>{server.name}</span>
                                {server.is_premium && (
                                  <Badge variant="default" className="text-xs">Premium</Badge>
                                )}
                                <div className="flex">
                                  {Array.from({ length: server.speed_rating }).map((_, i) => (
                                    <Zap key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                                  ))}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedServer && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">اختر الجودة:</label>
                        <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر جودة المشاهدة" />
                          </SelectTrigger>
                          <SelectContent>
                            {servers.find(s => s.id === selectedServer)?.streaming_links.map((link) => (
                              <SelectItem key={link.id} value={link.quality}>
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  <span>{link.quality}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {servers.map((server) => (
                        <Button
                          key={server.id}
                          variant={selectedServer === server.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedServer(server.id)}
                          className="flex items-center gap-1"
                        >
                          <Server className="h-3 w-3" />
                          {server.name}
                          {server.is_premium && (
                            <Badge variant="secondary" className="text-xs ml-1">P</Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
            </FadeInUp>

            {/* Player Settings */}
            <FadeInUp delay={400}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    إعدادات المشغل
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">التشغيل التلقائي:</span>
                    <Button
                      variant={autoPlay ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoPlay(!autoPlay)}
                    >
                      {autoPlay ? 'مفعل' : 'معطل'}
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سرعة التشغيل:</label>
                    <Select value={playbackSpeed.toString()} onValueChange={(value) => setPlaybackSpeed(parseFloat(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x (عادي)</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </FadeInUp>
          </div>

          {/* Season & Episode Navigation */}
          {type === 'episode' && (
            <div className="lg:col-span-2 space-y-6">
              <FadeInUp delay={300}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Grid3X3 className="h-5 w-5" />
                      المواسم والحلقات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Season Selector */}
                    {allSeasons.length > 1 && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">اختر الموسم:</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {allSeasons.map((season) => (
                            <Button
                              key={season.id}
                              variant={selectedSeason === season.season_number ? "default" : "outline"}
                              size="sm"
                              onClick={() => navigateToSeason(season.season_number)}
                              className="flex flex-col items-center gap-1 h-auto py-3"
                            >
                              <span className="font-medium">الموسم {season.season_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {season.episode_count} حلقة
                              </span>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Episode List Toggle */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">حلقات الموسم {selectedSeason}:</span>
                      <div className="flex gap-2">
                        <Button
                          variant={episodeViewMode === 'list' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEpisodeViewMode('list')}
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={episodeViewMode === 'grid' ? "default" : "outline"}
                          size="sm"
                          onClick={() => setEpisodeViewMode('grid')}
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowEpisodeList(!showEpisodeList)}
                        >
                          {showEpisodeList ? 'إخفاء' : 'عرض'} القائمة
                        </Button>
                      </div>
                    </div>

                    {/* Episodes List */}
                    {showEpisodeList && (
                      <ScrollArea className="h-64">
                        <div className={episodeViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                          {allEpisodes.map((ep, index) => (
                            <Button
                              key={ep.id}
                              variant={ep.id === id ? "default" : "outline"}
                              size="sm"
                              onClick={() => navigate(`/watch/episode/${ep.id}`)}
                              className={`${episodeViewMode === 'list' ? 'justify-start w-full' : 'flex-col h-auto py-2'}`}
                            >
                              <span className="font-medium">
                                الحلقة {ep.episode_number}
                              </span>
                              {ep.title && episodeViewMode === 'list' && (
                                <span className="text-xs text-muted-foreground truncate ml-2">
                                  {ep.title}
                                </span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}

                    {/* Quick Navigation */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => navigateEpisode('prev')}
                        disabled={currentEpisodeIndex === 0}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <SkipBack className="h-4 w-4 ml-1" />
                        الحلقة السابقة
                      </Button>
                      <Button
                        onClick={() => navigateEpisode('next')}
                        disabled={currentEpisodeIndex === allEpisodes.length - 1}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        الحلقة التالية
                        <SkipForward className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </FadeInUp>
            </div>
          )}
        </div>

        {/* Download Servers Section */}
        {downloadServers.length > 0 && (
          <FadeInUp delay={600}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  خوادم التحميل ({downloadServers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {downloadServers.map((server) => (
                    <Card key={server.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">{server.name}</h4>
                            {server.is_premium && (
                              <Badge variant="default">Premium</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {server.download_links.map((link) => (
                              <div key={link.id} className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium">{link.quality}</span>
                                  {link.file_size && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({link.file_size})
                                    </span>
                                  )}
                                </div>
                                <Button size="sm" asChild>
                                  <a 
                                    href={link.download_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    <Download className="h-4 w-4 ml-1" />
                                    تحميل
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>سرعة التحميل:</span>
                            <div className="flex">
                              {Array.from({ length: server.speed_rating }).map((_, i) => (
                                <Zap key={i} className="h-3 w-3 text-yellow-400 fill-current" />
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeInUp>
        )}

        {/* Content Description */}
        {(content.description || episode?.description) && (
          <FadeInUp delay={800}>
            <Card>
              <CardHeader>
                <CardTitle>الوصف</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {episode?.description || content.description}
                </p>
              </CardContent>
            </Card>
          </FadeInUp>
        )}
      </ResponsiveContainer>
    </div>
  );
}