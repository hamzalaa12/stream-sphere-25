import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, Settings, SkipBack, SkipForward, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EpisodeCard } from '@/components/content/EpisodeCard';
import { ServerCard } from '@/components/content/ServerCard';

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
}

interface EpisodeData {
  id: string;
  title?: string;
  episode_number: number;
  duration?: number;
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [content, setContent] = useState<ContentData | null>(null);
  const [episode, setEpisode] = useState<EpisodeData | null>(null);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeData[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [watchTime, setWatchTime] = useState(0);

  useEffect(() => {
    if (id) {
      if (type === 'episode') {
        fetchEpisodeData(id);
      } else {
        fetchMovieData(id);
      }
    }
  }, [id, type]);

  useEffect(() => {
    if (selectedServer) {
      saveWatchHistory();
    }
  }, [selectedServer, watchTime]);

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
      
      if (linksData && linksData.length > 0) {
        setSelectedServer(linksData[0].id);
      }
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
      
      if (linksData && linksData.length > 0) {
        setSelectedServer(linksData[0].id);
      }
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

  const saveWatchHistory = async () => {
    if (!user || !id) return;

    try {
      const watchData = {
        user_id: user.id,
        watch_time: Math.floor(watchTime),
        last_watched: new Date().toISOString(),
        completed: false,
        ...(type === 'episode' ? { episode_id: id } : { content_id: id })
      };

      await supabase
        .from('watch_history')
        .upsert(watchData);
    } catch (error) {
      console.error('Error saving watch history:', error);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setWatchTime(videoRef.current.currentTime);
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

  const getCurrentStreamingLink = () => {
    return streamingLinks.find(link => link.id === selectedServer);
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

  const currentLink = getCurrentStreamingLink();

  return (
    <div className="min-h-screen bg-background">
      {/* Video Player */}
      <div className="relative bg-black">
        <div className="aspect-video">
          {currentLink ? (
            <video
              ref={videoRef}
              src={currentLink.streaming_url}
              controls
              className="w-full h-full"
              onTimeUpdate={handleTimeUpdate}
              poster={content?.poster_url}
              preload="metadata"
            >
              المتصفح لا يدعم تشغيل الفيديو.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <p className="text-xl mb-4">لا توجد روابط متاحة للمشاهدة</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                  العودة
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70 z-10"
        >
          <ArrowLeft className="h-4 w-4 ml-1" />
          عودة
        </Button>
      </div>

      {/* Enhanced Controls and Info */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Title and Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold">
              {content?.title}
              {episode && ` - الحلقة ${episode.episode_number}`}
              {episode?.title && `: ${episode.title}`}
            </h1>
            {episode?.season && (
              <p className="text-xl text-muted-foreground">
                الموسم {episode.season.season_number}
              </p>
            )}
          </div>

          {type === 'episode' && allEpisodes.length > 1 && (
            <div className="flex gap-3">
              <Button
                onClick={() => navigateEpisode('prev')}
                disabled={currentEpisodeIndex === 0}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <SkipBack className="h-5 w-5" />
                الحلقة السابقة
              </Button>
              <Button
                onClick={() => navigateEpisode('next')}
                disabled={currentEpisodeIndex === allEpisodes.length - 1}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                الحلقة التالية
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>

        {/* Enhanced Server Selection and Options */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Server Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Settings className="h-6 w-6" />
                سيرفرات المشاهدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-base font-semibold mb-3 block">اختر السيرفر:</label>
                <div className="space-y-3">
                  {streamingLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedServer === link.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedServer(link.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">{link.server_name}</p>
                          <p className="text-sm text-muted-foreground">جودة {link.quality}</p>
                        </div>
                        {selectedServer === link.id && (
                          <Badge variant="default">نشط</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Episode List for Series */}
          {type === 'episode' && allEpisodes.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">حلقات الموسم {episode?.season?.season_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {allEpisodes.map((ep, index) => (
                    <Link
                      key={ep.id}
                      to={`/watch/episode/${ep.id}`}
                      className={`block p-4 rounded-lg transition-all border-2 ${
                        ep.id === id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-lg">
                            الحلقة {ep.episode_number}
                            {ep.title && `: ${ep.title}`}
                          </h4>
                          {ep.id === id && (
                            <Badge variant="default" className="text-xs">جاري المشاهدة</Badge>
                          )}
                        </div>
                        {ep.duration && (
                          <span className="text-muted-foreground font-medium">
                            {Math.floor(ep.duration / 60)}:{String(ep.duration % 60).padStart(2, '0')}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Movie Servers Display */}
          {type === 'movie' && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">السيرفرات المتاحة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {streamingLinks.map((link) => (
                    <div
                      key={link.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedServer === link.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedServer(link.id)}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">{link.server_name}</h4>
                          {selectedServer === link.id && (
                            <Badge variant="default">نشط</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">جودة {link.quality}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Download Servers Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Download className="h-6 w-6" />
              سيرفرات التحميل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {streamingLinks
                .filter(link => link.download_url)
                .map((link) => (
                <Card key={`download-${link.id}`} className="border-2 hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{link.server_name}</h4>
                          <p className="text-sm text-muted-foreground">جودة {link.quality}</p>
                        </div>
                        <Badge variant="outline">تحميل</Badge>
                      </div>
                      <Button asChild variant="outline" className="w-full gap-2">
                        <a
                          href={link.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          تحميل {link.quality}
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {streamingLinks.filter(link => link.download_url).length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Download className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد روابط تحميل متاحة حالياً</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Selection */}
        {streamingLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">الجودات المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[...new Set(streamingLinks.map(link => link.quality))].map((quality) => (
                  <Badge
                    key={quality}
                    variant={currentLink?.quality === quality ? 'default' : 'outline'}
                    className="cursor-pointer px-4 py-2 text-sm"
                    onClick={() => {
                      const linkWithQuality = streamingLinks.find(link => link.quality === quality);
                      if (linkWithQuality) setSelectedServer(linkWithQuality.id);
                    }}
                  >
                    {quality}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}