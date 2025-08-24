import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  SkipBack, 
  SkipForward,
  Server,
  Zap,
  Download,
  Share2,
  Heart,
  Flag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoQuality {
  id: string;
  quality: string;
  file_path: string;
  bitrate_kbps: number;
  server_id: string;
  server_name: string;
  is_ready: boolean;
}

interface VideoPlayerProps {
  contentId?: string;
  episodeId?: string;
  onProgress?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  autoPlay?: boolean;
  poster?: string;
}

export const AdvancedVideoPlayer: React.FC<VideoPlayerProps> = ({
  contentId,
  episodeId,
  onProgress,
  onComplete,
  autoPlay = false,
  poster
}) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // مصادر الفيديو
  const [videoQualities, setVideoQualities] = useState<VideoQuality[]>([]);
  const [currentQuality, setCurrentQuality] = useState<VideoQuality | null>(null);
  const [currentServer, setCurrentServer] = useState<string>('');
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  
  // إعدادات التشغيل
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [skipDuration, setSkipDuration] = useState(10);
  
  // إحصائيات
  const [bufferedRanges, setBufferedRanges] = useState<number[]>([]);
  const [networkSpeed, setNetworkSpeed] = useState(0);
  const [droppedFrames, setDroppedFrames] = useState(0);

  // تحميل مصادر الفيديو
  useEffect(() => {
    if (contentId || episodeId) {
      loadVideoSources();
    }
  }, [contentId, episodeId]);

  // إخفاء التحكم تلقائياً
  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (isPlaying) setShowControls(false);
      });
    }

    return () => {
      clearTimeout(hideTimeout);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', () => {});
      }
    };
  }, [isPlaying]);

  // تحديث الوقت والتقدم
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
      onProgress?.(video.currentTime, video.duration || 0);
      
      // تحديث المناطق المحملة
      const buffered = video.buffered;
      const ranges: number[] = [];
      for (let i = 0; i < buffered.length; i++) {
        ranges.push(buffered.start(i), buffered.end(i));
      }
      setBufferedRanges(ranges);
    };

    const updateNetworkStats = () => {
      // حساب سرعة الشبكة (تقريبي)
      if (video.buffered.length > 0) {
        const bufferedTime = video.buffered.end(video.buffered.length - 1);
        const loadTime = video.currentTime;
        setNetworkSpeed(bufferedTime / loadTime);
      }
      
      // عدد الإطارات المفقودة (WebKit فقط)
      if ('webkitDroppedVideoFrames' in video) {
        setDroppedFrames((video as any).webkitDroppedVideoFrames);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('progress', updateNetworkStats);
    video.addEventListener('loadedmetadata', updateTime);
    video.addEventListener('ended', () => {
      setIsPlaying(false);
      onComplete?.();
    });

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('progress', updateNetworkStats);
      video.removeEventListener('loadedmetadata', updateTime);
    };
  }, [onProgress, onComplete]);

  const loadVideoSources = async () => {
    try {
      setIsLoading(true);
      
      // جلب مصادر الفيديو حسب المحتوى أو الحلقة
      const query = supabase
        .from('video_qualities')
        .select(`
          *,
          internal_servers(name)
        `)
        .eq('is_ready', true);

      if (contentId) {
        query.eq('video_files.content_id', contentId);
      } else if (episodeId) {
        query.eq('video_files.episode_id', episodeId);
      }

      const { data: qualities, error } = await query;

      if (error) throw error;

      const processedQualities: VideoQuality[] = (qualities || []).map(q => ({
        id: q.id,
        quality: q.quality,
        file_path: q.file_path,
        bitrate_kbps: q.bitrate_kbps,
        server_id: q.server_id,
        server_name: q.internal_servers?.name || 'سيرفر غير معروف',
        is_ready: q.is_ready
      }));

      setVideoQualities(processedQualities);

      // استخراج السيرفرات المتاحة
      const servers = [...new Set(processedQualities.map(q => q.server_name))];
      setAvailableServers(servers);

      // اختيار أفضل جودة افتراضياً
      if (processedQualities.length > 0) {
        const defaultQuality = processedQualities.find(q => q.quality === '720p') || processedQualities[0];
        setCurrentQuality(defaultQuality);
        setCurrentServer(defaultQuality.server_name);
      }

    } catch (error) {
      console.error('Error loading video sources:', error);
      setHasError(true);
      toast({
        title: 'خطأ في تحميل الفيديو',
        description: 'لا يمكن تحميل مصادر الفيديو',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = value[0];
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = value[0];
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(video.currentTime + skipDuration, duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(video.currentTime - skipDuration, 0);
  };

  const changePlaybackSpeed = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const changeQuality = (qualityId: string) => {
    const quality = videoQualities.find(q => q.id === qualityId);
    if (!quality || !videoRef.current) return;

    const video = videoRef.current;
    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;

    setCurrentQuality(quality);
    
    // تسجيل الانتقال بين الجودات
    recordQualityChange(qualityId);

    // إعادة تحميل الفيديو بالجودة الجديدة
    video.src = quality.file_path;
    video.currentTime = currentTime;
    
    if (wasPlaying) {
      video.play();
    }

    toast({
      title: 'تم تغيير الجودة',
      description: `تم التبديل إلى جودة ${quality.quality}`
    });
  };

  const changeServer = (serverName: string) => {
    const serverQualities = videoQualities.filter(q => q.server_name === serverName);
    if (serverQualities.length === 0) return;

    // اختيار نفس الجودة من السيرفر الجديد إن أمكن
    const sameQuality = serverQualities.find(q => q.quality === currentQuality?.quality);
    const newQuality = sameQuality || serverQualities[0];

    setCurrentServer(serverName);
    changeQuality(newQuality.id);

    toast({
      title: 'تم تغيير السيرفر',
      description: `تم التبديل إلى ${serverName}`
    });
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // مراقبة تغيير وضع الشاشة الكاملة
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const recordQualityChange = async (qualityId: string) => {
    try {
      await supabase
        .from('video_activity_log')
        .insert({
          video_file_id: currentQuality?.id,
          activity_type: 'quality_change',
          details: { 
            from_quality: currentQuality?.quality,
            to_quality: videoQualities.find(q => q.id === qualityId)?.quality
          }
        });
    } catch (error) {
      console.error('Error recording quality change:', error);
    }
  };

  const downloadVideo = () => {
    if (!currentQuality) return;

    const link = document.createElement('a');
    link.href = currentQuality.file_path;
    link.download = `video_${currentQuality.quality}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'بدء التحميل',
      description: `جاري تحميل الفيديو بجودة ${currentQuality.quality}`
    });
  };

  const shareVideo = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'مشاهدة فيديو',
          url: url
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // نسخ الرابط
      navigator.clipboard.writeText(url);
      toast({
        title: 'تم نسخ الرابط',
        description: 'تم نسخ رابط الفيديو إلى الحافظة'
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>جاري تحميل الفيديو...</p>
        </div>
      </div>
    );
  }

  if (hasError || !currentQuality) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <Flag className="h-12 w-12 mx-auto mb-2" />
          <p>عذراً، لا يمكن تحميل الفيديو</p>
          <Button variant="outline" onClick={loadVideoSources} className="mt-2">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black group ${isFullscreen ? 'w-screen h-screen' : 'aspect-video'}`}
      onDoubleClick={toggleFullscreen}
    >
      {/* مشغل الفيديو */}
      <video
        ref={videoRef}
        className="w-full h-full"
        src={currentQuality.file_path}
        poster={poster}
        autoPlay={autoPlay}
        onLoadStart={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        onClick={togglePlay}
      />

      {/* طبقة التحكم */}
      <div 
        className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* التحكم العلوي */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className="flex gap-2">
            <Badge variant="secondary">{currentQuality.quality}</Badge>
            <Badge variant="outline">{currentServer}</Badge>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={shareVideo}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={downloadVideo}>
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="absolute bottom-20 left-4 right-4">
          <div className="mb-2">
            <Slider
              value={[currentTime]}
              max={duration}
              step={1}
              onValueChange={handleSeek}
              className="w-full"
            />
            {/* المناطق المحملة */}
            <div className="relative h-1 mt-1">
              {bufferedRanges.map((range, index) => {
                if (index % 2 === 1) return null;
                const start = (bufferedRanges[index] / duration) * 100;
                const end = (bufferedRanges[index + 1] / duration) * 100;
                return (
                  <div
                    key={index}
                    className="absolute h-full bg-white/30"
                    style={{ left: `${start}%`, width: `${end - start}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* التحكم السفلي */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* أزرار التشغيل */}
            <Button size="sm" variant="ghost" onClick={skipBackward}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={skipForward}>
              <SkipForward className="h-4 w-4" />
            </Button>

            {/* التحكم في الصوت */}
            <Button size="sm" variant="ghost" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />

            {/* الوقت */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* إعدادات الجودة والسيرفر */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">السيرفر</label>
                    <Select value={currentServer} onValueChange={changeServer}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableServers.map(server => (
                          <SelectItem key={server} value={server}>
                            <div className="flex items-center gap-2">
                              <Server className="h-3 w-3" />
                              {server}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">الجودة</label>
                    <Select value={currentQuality?.id} onValueChange={changeQuality}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {videoQualities
                          .filter(q => q.server_name === currentServer)
                          .map(quality => (
                            <SelectItem key={quality.id} value={quality.id}>
                              <div className="flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                {quality.quality} - {quality.bitrate_kbps}kbps
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">سرعة التشغيل</label>
                    <Select value={playbackSpeed.toString()} onValueChange={(value) => changePlaybackSpeed(parseFloat(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1x</SelectItem>
                        <SelectItem value="1.25">1.25x</SelectItem>
                        <SelectItem value="1.5">1.5x</SelectItem>
                        <SelectItem value="2">2x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* إحصائيات التشغيل */}
                  <Separator />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>سرعة الشبكة: {networkSpeed.toFixed(2)}x</div>
                    <div>الإطارات المفقودة: {droppedFrames}</div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* شاشة كاملة */}
            <Button size="sm" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
