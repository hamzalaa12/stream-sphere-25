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
        <div className="aspect-video max-h-[70vh]">
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
          className="absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70"
        >
          <ArrowLeft className="h-4 w-4 ml-1" />
          عودة
        </Button>
      </div>

      {/* Controls and Info */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Title and Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              {content?.title}
              {episode && ` - الحلقة ${episode.episode_number}`}
              {episode?.title && `: ${episode.title}`}
            </h1>
            {episode?.season && (
              <p className="text-muted-foreground">
                الموسم {episode.season.season_number}
              </p>
            )}
          </div>

          {type === 'episode' && allEpisodes.length > 1 && (
            <div className="flex gap-2">
              <Button
                onClick={() => navigateEpisode('prev')}
                disabled={currentEpisodeIndex === 0}
                variant="outline"
                size="sm"
              >
                <SkipBack className="h-4 w-4 ml-1" />
                الحلقة السابقة
              </Button>
              <Button
                onClick={() => navigateEpisode('next')}
                disabled={currentEpisodeIndex === allEpisodes.length - 1}
                variant="outline"
                size="sm"
              >
                الحلقة التالية
                <SkipForward className="h-4 w-4 mr-1" />
              </Button>
            </div>
          )}
        </div>

        {/* Server Selection and Download */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                خيارات المشاهدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اختر الخادم:</label>
                <Select value={selectedServer} onValueChange={setSelectedServer}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر خادم المشاهدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {streamingLinks.map((link) => (
                      <SelectItem key={link.id} value={link.id}>
                        {link.server_name} - {link.quality}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentLink?.download_url && (
                <div>
                  <label className="text-sm font-medium mb-2 block">روابط التحميل:</label>
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={currentLink.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 ml-2" />
                      تحميل بجودة {currentLink.quality}
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Episode List for Series */}
          {type === 'episode' && allEpisodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>حلقات الموسم {episode?.season?.season_number}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {allEpisodes.map((ep, index) => (
                    <Link
                      key={ep.id}
                      to={`/watch/episode/${ep.id}`}
                      className={`block p-3 rounded-lg transition-smooth ${
                        ep.id === id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background-secondary hover:bg-muted'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          الحلقة {ep.episode_number}
                          {ep.title && `: ${ep.title}`}
                        </span>
                        {ep.duration && (
                          <span className="text-sm text-muted-foreground">
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
        </div>

        {/* Available Servers */}
        {streamingLinks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>الخوادم المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {streamingLinks.map((link) => (
                  <Badge
                    key={link.id}
                    variant={selectedServer === link.id ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => setSelectedServer(link.id)}
                  >
                    {link.server_name} ({link.quality})
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