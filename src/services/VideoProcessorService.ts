import { supabase } from '@/integrations/supabase/client';

export interface TranscodingOptions {
  quality: string;
  resolution: string;
  bitrate: number;
  codec: string;
  format: string;
  audioCodec?: string;
  audioBitrate?: number;
}

export interface ProcessingJob {
  id: string;
  video_file_id: string;
  job_type: 'transcode' | 'thumbnail' | 'backup' | 'analyze';
  target_quality?: string;
  target_server_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
}

export interface VideoAnalysis {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  frameRate: number;
  videoCodec: string;
  audioCodec: string;
  fileSize: number;
  aspectRatio: string;
  channels: number;
  sampleRate: number;
}

export class VideoProcessorService {
  private static readonly QUALITY_PRESETS: Record<string, TranscodingOptions> = {
    '360p': {
      quality: '360p',
      resolution: '640x360',
      bitrate: 800,
      codec: 'libx264',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 96
    },
    '480p': {
      quality: '480p',
      resolution: '854x480',
      bitrate: 1200,
      codec: 'libx264',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 128
    },
    '720p': {
      quality: '720p',
      resolution: '1280x720',
      bitrate: 2500,
      codec: 'libx264',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 128
    },
    '1080p': {
      quality: '1080p',
      resolution: '1920x1080',
      bitrate: 5000,
      codec: 'libx264',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 192
    },
    '1440p': {
      quality: '1440p',
      resolution: '2560x1440',
      bitrate: 8000,
      codec: 'libx264',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 192
    },
    '2160p': {
      quality: '2160p',
      resolution: '3840x2160',
      bitrate: 15000,
      codec: 'libx265',
      format: 'mp4',
      audioCodec: 'aac',
      audioBitrate: 256
    }
  };

  // تحليل ملف الفيديو
  static async analyzeVideo(inputPath: string): Promise<VideoAnalysis> {
    try {
      // في التطبيق الحقيقي، هذا سيستخدم FFprobe لتحليل الفيديو
      const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${inputPath}"`;
      
      // محاكاة تحليل الفيديو
      const analysis: VideoAnalysis = {
        duration: 3600, // 1 hour
        width: 1920,
        height: 1080,
        bitrate: 5000,
        frameRate: 25,
        videoCodec: 'h264',
        audioCodec: 'aac',
        fileSize: 2147483648, // 2GB
        aspectRatio: '16:9',
        channels: 2,
        sampleRate: 48000
      };

      return analysis;
    } catch (error) {
      console.error('Error analyzing video:', error);
      throw new Error('فشل في تحليل ملف الفيديو');
    }
  }

  // تحويل الفيديو إلى جودة معينة
  static async transcodeVideo(
    inputPath: string,
    outputPath: string,
    quality: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const preset = this.QUALITY_PRESETS[quality];
    if (!preset) {
      throw new Error(`جودة غير مدعومة: ${quality}`);
    }

    try {
      // بناء أمر FFmpeg
      const ffmpegCommand = this.buildFFmpegCommand(inputPath, outputPath, preset);
      
      console.log('Starting transcoding with command:', ffmpegCommand);

      // في التطبيق الحقيقي، هذا سيشغل FFmpeg فعلياً
      await this.runFFmpegCommand(ffmpegCommand, onProgress);

      console.log(`Transcoding completed: ${outputPath}`);
    } catch (error) {
      console.error('Error transcoding video:', error);
      throw new Error(`فشل في تحويل الفيديو إلى ${quality}: ${error}`);
    }
  }

  // توليد الصور المصغرة
  static async generateThumbnails(
    inputPath: string,
    outputDir: string,
    count: number = 10
  ): Promise<string[]> {
    try {
      const thumbnailPaths: string[] = [];
      
      // تحليل الفيديو أولاً لمعرفة المدة
      const analysis = await this.analyzeVideo(inputPath);
      const interval = analysis.duration / count;

      for (let i = 0; i < count; i++) {
        const timestamp = i * interval;
        const thumbnailPath = `${outputDir}/thumb_${i + 1}.jpg`;
        
        // بناء أمر FFmpeg لاستخراج الصورة المصغرة
        const command = this.buildThumbnailCommand(inputPath, thumbnailPath, timestamp);
        
        // في التطبيق الحقيقي، هذا سيشغل FFmpeg
        await this.runFFmpegCommand(command);
        
        thumbnailPaths.push(thumbnailPath);
      }

      return thumbnailPaths;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      throw new Error('فشل في توليد الصور المصغرة');
    }
  }

  // إنشاء معاينة للفيديو (trailer)
  static async generatePreview(
    inputPath: string,
    outputPath: string,
    duration: number = 60
  ): Promise<void> {
    try {
      const analysis = await this.analyzeVideo(inputPath);
      const startTime = Math.max(0, (analysis.duration / 2) - (duration / 2));

      const command = [
        'ffmpeg',
        '-i', `"${inputPath}"`,
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-vf', 'scale=1280:720',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:v', '2000k',
        '-b:a', '128k',
        '-preset', 'fast',
        `"${outputPath}"`
      ].join(' ');

      await this.runFFmpegCommand(command);
    } catch (error) {
      console.error('Error generating preview:', error);
      throw new Error('فشل في إنشاء معاينة الفيديو');
    }
  }

  // ضغط الفيديو
  static async compressVideo(
    inputPath: string,
    outputPath: string,
    compressionLevel: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    const compressionSettings = {
      low: { crf: 18, preset: 'slow' },
      medium: { crf: 23, preset: 'medium' },
      high: { crf: 28, preset: 'fast' }
    };

    const settings = compressionSettings[compressionLevel];

    try {
      const command = [
        'ffmpeg',
        '-i', `"${inputPath}"`,
        '-c:v', 'libx264',
        '-crf', settings.crf.toString(),
        '-preset', settings.preset,
        '-c:a', 'aac',
        '-b:a', '128k',
        `"${outputPath}"`
      ].join(' ');

      await this.runFFmpegCommand(command);
    } catch (error) {
      console.error('Error compressing video:', error);
      throw new Error('فشل في ضغط الفيديو');
    }
  }

  // تحويل إلى تنسيق مختلف
  static async convertFormat(
    inputPath: string,
    outputPath: string,
    format: 'mp4' | 'webm' | 'avi' | 'mkv'
  ): Promise<void> {
    const formatSettings = {
      mp4: { codec: 'libx264', audioCodec: 'aac' },
      webm: { codec: 'libvpx-vp9', audioCodec: 'libvorbis' },
      avi: { codec: 'libx264', audioCodec: 'mp3' },
      mkv: { codec: 'libx264', audioCodec: 'aac' }
    };

    const settings = formatSettings[format];

    try {
      const command = [
        'ffmpeg',
        '-i', `"${inputPath}"`,
        '-c:v', settings.codec,
        '-c:a', settings.audioCodec,
        '-preset', 'medium',
        `"${outputPath}"`
      ].join(' ');

      await this.runFFmpegCommand(command);
    } catch (error) {
      console.error('Error converting format:', error);
      throw new Error(`فشل في تحويل الفيديو إلى تنسيق ${format}`);
    }
  }

  // معالجة مجموعة من المهام
  static async processJobQueue(): Promise<void> {
    try {
      // الحصول على المهام المعلقة
      const { data: jobs, error } = await supabase
        .from('video_processing_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at')
        .limit(5);

      if (error) throw error;

      if (!jobs || jobs.length === 0) {
        console.log('No pending jobs found');
        return;
      }

      // معالجة كل مهمة
      for (const job of jobs) {
        try {
          await this.processJob(job);
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          
          // تحديث حالة المهمة لفاشلة
          await supabase
            .from('video_processing_jobs')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'خطأ غير معروف'
            })
            .eq('id', job.id);
        }
      }
    } catch (error) {
      console.error('Error processing job queue:', error);
    }
  }

  // معالجة مهمة واحدة
  static async processJob(job: ProcessingJob): Promise<void> {
    // تحديث حالة المهمة لبدء المعالجة
    await supabase
      .from('video_processing_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id);

    try {
      // الحصول على معلومات ملف الفيديو
      const { data: videoFile } = await supabase
        .from('video_files')
        .select('*')
        .eq('id', job.video_file_id)
        .single();

      if (!videoFile) {
        throw new Error('ملف الفيديو غير موجود');
      }

      // مسار الملف الأصلي (في التطبيق الحقيقي)
      const inputPath = `/storage/videos/${videoFile.id}/${videoFile.original_filename}`;

      switch (job.job_type) {
        case 'transcode':
          if (!job.target_quality) throw new Error('الجودة المستهدفة غير محددة');
          
          const outputPath = `/storage/videos/${videoFile.id}/${job.target_quality}.mp4`;
          
          await this.transcodeVideo(
            inputPath,
            outputPath,
            job.target_quality,
            async (progress) => {
              // تحديث التقدم
              await supabase
                .from('video_processing_jobs')
                .update({ progress })
                .eq('id', job.id);
            }
          );
          
          // حفظ معلومات الجودة الجديدة
          await this.saveVideoQuality(job.video_file_id, job.target_quality, outputPath, job.target_server_id!);
          break;

        case 'thumbnail':
          const thumbnailDir = `/storage/thumbnails/${videoFile.id}`;
          const thumbnails = await this.generateThumbnails(inputPath, thumbnailDir);
          
          // حفظ مسارات الصور المصغرة
          await this.saveThumbnails(job.video_file_id, thumbnails);
          break;

        case 'analyze':
          const analysis = await this.analyzeVideo(inputPath);
          
          // تحديث معلومات ملف ال��يديو
          await supabase
            .from('video_files')
            .update({
              duration_seconds: analysis.duration,
              // يمكن إضافة معلومات أخرى من التحليل
            })
            .eq('id', job.video_file_id);
          break;

        default:
          throw new Error(`نوع مهمة غير مدعوم: ${job.job_type}`);
      }

      // تحديث حالة المهمة لمكتملة
      await supabase
        .from('video_processing_jobs')
        .update({
          status: 'completed',
          progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id);

    } catch (error) {
      throw error;
    }
  }

  // بناء أمر FFmpeg للتحويل
  private static buildFFmpegCommand(
    inputPath: string,
    outputPath: string,
    preset: TranscodingOptions
  ): string {
    return [
      'ffmpeg',
      '-i', `"${inputPath}"`,
      '-vf', `scale=${preset.resolution}`,
      '-c:v', preset.codec,
      '-b:v', `${preset.bitrate}k`,
      '-c:a', preset.audioCodec || 'aac',
      '-b:a', `${preset.audioBitrate}k`,
      '-preset', 'medium',
      '-movflags', '+faststart', // للتحميل السريع
      '-y', // استبدال الملف إذا كان موجوداً
      `"${outputPath}"`
    ].join(' ');
  }

  // بناء أمر FFmpeg للصور المصغرة
  private static buildThumbnailCommand(
    inputPath: string,
    outputPath: string,
    timestamp: number
  ): string {
    return [
      'ffmpeg',
      '-i', `"${inputPath}"`,
      '-ss', timestamp.toString(),
      '-vframes', '1',
      '-vf', 'scale=320:180',
      '-q:v', '2',
      '-y',
      `"${outputPath}"`
    ].join(' ');
  }

  // تشغيل أمر FFmpeg (محاكاة)
  private static async runFFmpegCommand(
    command: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('Running FFmpeg command:', command);
    
    // محاكاة التشغيل مع التقدم
    if (onProgress) {
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        onProgress(progress);
      }
    } else {
      // انتظار افتراضي للمعالجة
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('FFmpeg command completed');
  }

  // حفظ معلومات جودة الفيديو
  private static async saveVideoQuality(
    videoFileId: string,
    quality: string,
    filePath: string,
    serverId: string
  ): Promise<void> {
    const preset = this.QUALITY_PRESETS[quality];
    
    await supabase
      .from('video_qualities')
      .insert({
        video_file_id: videoFileId,
        server_id: serverId,
        quality: quality,
        file_path: filePath,
        file_size_bytes: Math.floor(Math.random() * 1000000000), // محاكاة
        bitrate_kbps: preset.bitrate,
        codec: preset.codec,
        container_format: preset.format,
        is_ready: true
      });
  }

  // حفظ مسارات الصور المصغرة
  private static async saveThumbnails(
    videoFileId: string,
    thumbnailPaths: string[]
  ): Promise<void> {
    // في التطبيق الحقيقي، يمكن حفظ مسارات الصور المصغرة في جدول منفصل
    // أو في حقل JSON في جدول video_files
    
    console.log(`Saved ${thumbnailPaths.length} thumbnails for video ${videoFileId}`);
  }

  // جدولة مهام معالجة تلقائية
  static async scheduleProcessingJobs(videoFileId: string): Promise<void> {
    const qualities = ['360p', '480p', '720p', '1080p'];
    
    // الحصول على السيرفرات النشطة
    const { data: servers } = await supabase
      .from('internal_servers')
      .select('id')
      .eq('is_active', true)
      .order('priority');

    if (!servers || servers.length === 0) {
      throw new Error('لا توجد سيرفرات نشطة متاحة');
    }

    // إنشاء مهام الت��ويل لكل جودة
    for (const quality of qualities) {
      for (const server of servers) {
        await supabase
          .from('video_processing_jobs')
          .insert({
            video_file_id: videoFileId,
            job_type: 'transcode',
            target_quality: quality,
            target_server_id: server.id,
            status: 'pending'
          });
      }
    }

    // إنشاء مهمة توليد الصور المصغرة
    await supabase
      .from('video_processing_jobs')
      .insert({
        video_file_id: videoFileId,
        job_type: 'thumbnail',
        status: 'pending'
      });

    // إنشاء مهمة تحليل الفيديو
    await supabase
      .from('video_processing_jobs')
      .insert({
        video_file_id: videoFileId,
        job_type: 'analyze',
        status: 'pending'
      });
  }

  // مراقبة حالة المعالجة
  static async getProcessingStatus(videoFileId: string): Promise<any> {
    const { data: jobs } = await supabase
      .from('video_processing_jobs')
      .select('*')
      .eq('video_file_id', videoFileId)
      .order('created_at');

    const total = jobs?.length || 0;
    const completed = jobs?.filter(job => job.status === 'completed').length || 0;
    const failed = jobs?.filter(job => job.status === 'failed').length || 0;
    const processing = jobs?.filter(job => job.status === 'processing').length || 0;

    return {
      total,
      completed,
      failed,
      processing,
      pending: total - completed - failed - processing,
      progress: total > 0 ? (completed / total) * 100 : 0,
      jobs: jobs || []
    };
  }
}
