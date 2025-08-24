import { supabase } from '@/integrations/supabase/client';

export interface UploadSession {
  id: string;
  video_file_id: string;
  chunk_size: number;
  total_chunks: number;
  uploaded_chunks: number;
  upload_progress: number;
  session_token: string;
  expires_at: string;
}

export interface VideoFile {
  id: string;
  content_id?: string;
  episode_id?: string;
  original_filename: string;
  file_size_bytes: number;
  duration_seconds?: number;
  mime_type: string;
  upload_status: 'uploading' | 'processing' | 'completed' | 'failed';
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface UploadChunk {
  chunk_number: number;
  chunk_data: ArrayBuffer;
  checksum?: string;
}

export interface VideoQuality {
  quality: string;
  file_path: string;
  file_size_bytes: number;
  bitrate_kbps?: number;
  codec?: string;
  container_format?: string;
}

export class VideoUploadService {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB
  private static readonly SUPPORTED_FORMATS = [
    'video/mp4',
    'video/avi',
    'video/mkv',
    'video/mov',
    'video/wmv',
    'video/webm'
  ];

  // إنشاء جلسة رفع جديدة
  static async createUploadSession(
    file: File,
    contentId?: string,
    episodeId?: string
  ): Promise<{ session: UploadSession; videoFile: VideoFile }> {
    // التحقق من صحة الملف
    this.validateFile(file);

    // حساب عدد القطع المطلوبة
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    const sessionToken = this.generateSessionToken();

    try {
      // إنشاء سجل ملف الفيديو
      const { data: videoFile, error: videoError } = await supabase
        .from('video_files')
        .insert({
          content_id: contentId || null,
          episode_id: episodeId || null,
          original_filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type,
          upload_status: 'uploading',
          processing_status: 'pending'
        })
        .select()
        .single();

      if (videoError) throw videoError;

      // إنشاء جلسة الرفع
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // تنتهي الجلسة خلال 24 ساعة

      const { data: session, error: sessionError } = await supabase
        .from('upload_sessions')
        .insert({
          video_file_id: videoFile.id,
          chunk_size: this.CHUNK_SIZE,
          total_chunks: totalChunks,
          uploaded_chunks: 0,
          upload_progress: 0,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      return { session, videoFile };
    } catch (error) {
      console.error('Error creating upload session:', error);
      throw new Error('فش�� في إنشاء جلسة الرفع');
    }
  }

  // رفع قطعة من الملف مع آلية إعادة المحاولة
  static async uploadChunk(
    sessionId: string,
    chunkNumber: number,
    chunkData: ArrayBuffer,
    onProgress?: (progress: number) => void,
    retryCount = 0
  ): Promise<boolean> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    try {
      // حساب checksum للقطعة
      const checksum = await this.calculateChecksum(chunkData);

      // التحقق من الجلسة وتجديدها إذا لزم الأمر
      const session = await this.validateAndRefreshSession(sessionId);

      // التحقق من وجود القطعة مسبقاً
      const { data: existingChunk } = await supabase
        .from('upload_chunks')
        .select('*')
        .eq('session_id', sessionId)
        .eq('chunk_number', chunkNumber)
        .eq('is_uploaded', true)
        .single();

      if (existingChunk) {
        // القطعة موجودة مسبقاً، لا حاجة لرفعها مرة أخرى
        console.log(`Chunk ${chunkNumber} already uploaded, skipping...`);
        if (onProgress) {
          const newProgress = ((session.uploaded_chunks + 1) / session.total_chunks) * 100;
          onProgress(newProgress);
        }
        return true;
      }

      // رفع القطعة إلى التخزين (في التطبيق الحقيقي، هذا سيكون إلى S3 أو سيرفر ملفات)
      const chunkPath = await this.uploadChunkToStorage(
        session.video_file_id,
        chunkNumber,
        chunkData
      );

      // تسجيل القطعة في قاعدة البيانات
      const { error: chunkError } = await supabase
        .from('upload_chunks')
        .insert({
          session_id: sessionId,
          chunk_number: chunkNumber,
          chunk_size: chunkData.byteLength,
          checksum: checksum,
          is_uploaded: true,
          uploaded_at: new Date().toISOString()
        });

      if (chunkError) throw chunkError;

      // تحديث التقدم
      const newUploadedChunks = session.uploaded_chunks + 1;
      const newProgress = (newUploadedChunks / session.total_chunks) * 100;

      await supabase
        .from('upload_sessions')
        .update({
          uploaded_chunks: newUploadedChunks,
          upload_progress: newProgress
        })
        .eq('id', sessionId);

      if (onProgress) {
        onProgress(newProgress);
      }

      // إذا انتهى الرفع، بدء معالجة الفيديو
      if (newUploadedChunks === session.total_chunks) {
        await this.completeUpload(sessionId);
      }

      return true;
    } catch (error) {
      console.error(`Error uploading chunk ${chunkNumber} (attempt ${retryCount + 1}):`, error);

      // إعادة المحاولة في حالة الفشل
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying chunk ${chunkNumber} in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return this.uploadChunk(sessionId, chunkNumber, chunkData, onProgress, retryCount + 1);
      }

      // فشل نهائياً بعد المحاولات
      const errorMessage = error instanceof Error ? error.message : 'فشل غير معروف';
      throw new Error(`فشل نهائي في رفع القطعة ${chunkNumber}: ${errorMessage}`);
    }
  }

  // التحقق من صحة الجلسة وتجديدها إذا لزم الأمر
  static async validateAndRefreshSession(sessionId: string): Promise<any> {
    const { data: session } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new Error('جلسة الرفع غير موجودة');
    }

    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

    // إذا كانت الجلسة ستنتهي ��لال ساعة واحدة، قم بتجديدها
    if (timeUntilExpiry < oneHour) {
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 24); // تمديد لـ 24 ساعة إضافية

      const { error } = await supabase
        .from('upload_sessions')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error refreshing session:', error);
        // لا نرمي خطأ هنا، نتابع بالجلسة الحالية
      } else {
        console.log(`Session ${sessionId} refreshed until ${newExpiresAt.toISOString()}`);
      }
    }

    return session;
  }

  // استئناف الرفع من النقطة التي توقف عندها
  static async resumeUpload(sessionId: string): Promise<number> {
    try {
      const { data: uploadedChunks } = await supabase
        .from('upload_chunks')
        .select('chunk_number')
        .eq('session_id', sessionId)
        .eq('is_uploaded', true)
        .order('chunk_number');

      const uploadedChunkNumbers = new Set(uploadedChunks?.map(c => c.chunk_number) || []);

      // العثور على أول قطعة مفقودة
      const { data: session } = await supabase
        .from('upload_sessions')
        .select('total_chunks')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('جلسة الرفع غير موجودة');

      for (let i = 0; i < session.total_chunks; i++) {
        if (!uploadedChunkNumbers.has(i)) {
          return i; // أول قطعة مفقودة
        }
      }

      return session.total_chunks; // كل القطع تم رفعها
    } catch (error) {
      console.error('Error resuming upload:', error);
      return 0; // ابدأ من البداية في حالة الخطأ
    }
  }

  // إكمال عملية الرفع
  static async completeUpload(sessionId: string): Promise<void> {
    try {
      // الحصول على معلومات الجلسة
      const { data: session } = await supabase
        .from('upload_sessions')
        .select('*, video_files(*)')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('جلسة الرفع غير موجودة');

      // دمج القطع لتكوين الملف الأصلي
      const mergedFilePath = await this.mergeChunks(sessionId);

      // استخراج معلومات الفيديو
      const videoInfo = await this.extractVideoInfo(mergedFilePath);

      // تحديث معلومات ملف الفيديو
      await supabase
        .from('video_files')
        .update({
          duration_seconds: videoInfo.duration,
          upload_status: 'completed',
          processing_status: 'processing'
        })
        .eq('id', session.video_file_id);

      // بدء معالجة الفيديو
      await this.startVideoProcessing(session.video_file_id, mergedFilePath);

      // تسجيل النشاط
      await this.logActivity(session.video_file_id, 'upload_completed');

    } catch (error) {
      console.error('Error completing upload:', error);
      throw new Error('فشل في إكمال عملية الرفع');
    }
  }

  // بدء معالجة الفيديو
  static async startVideoProcessing(videoFileId: string, inputPath: string): Promise<void> {
    const qualities = ['360p', '480p', '720p', '1080p'];
    const servers = await this.getAvailableServers();

    try {
      // إنشاء مهام معالجة لكل جودة وسيرفر
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

      // إنشاء مهمة إنشاء الصور المصغرة
      await supabase
        .from('video_processing_jobs')
        .insert({
          video_file_id: videoFileId,
          job_type: 'thumbnail',
          status: 'pending'
        });

    } catch (error) {
      console.error('Error starting video processing:', error);
      throw new Error('فشل في بدء معالجة الفيديو');
    }
  }

  // معالجة مهمة فيديو
  static async processVideoJob(jobId: string): Promise<void> {
    try {
      const { data: job } = await supabase
        .from('video_processing_jobs')
        .select('*, video_files(*), internal_servers(*)')
        .eq('id', jobId)
        .single();

      if (!job) throw new Error('المهمة غير موجودة');

      // تحديث حالة المهمة
      await supabase
        .from('video_processing_jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', jobId);

      let outputPath: string;

      switch (job.job_type) {
        case 'transcode':
          outputPath = await this.transcodeVideo(
            job.video_files.original_filename,
            job.target_quality!,
            job.internal_servers?.storage_path!
          );
          
          // حفظ معلومات الجودة
          await this.saveVideoQuality(job.video_file_id, {
            quality: job.target_quality!,
            file_path: outputPath,
            file_size_bytes: await this.getFileSize(outputPath),
            server_id: job.target_server_id!
          });
          break;

        case 'thumbnail':
          outputPath = await this.generateThumbnails(job.video_files.original_filename);
          break;

        default:
          throw new Error('نوع مهمة غير مدعوم');
      }

      // تحديث حالة المهمة لمكتملة
      await supabase
        .from('video_processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: 100
        })
        .eq('id', jobId);

      // تسجيل النشاط
      await this.logActivity(job.video_file_id, 'processing_completed', {
        job_type: job.job_type,
        quality: job.target_quality
      });

    } catch (error) {
      console.error('Error processing video job:', error);
      
      // تحديث حالة المهمة لفاشلة
      await supabase
        .from('video_processing_jobs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'خطأ غير معروف'
        })
        .eq('id', jobId);
      
      throw error;
    }
  }

  // التحقق من صحة الملف
  private static validateFile(file: File): void {
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`حجم الملف كبير جداً. الحد الأقصى ${this.MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`);
    }

    if (!this.SUPPORTED_FORMATS.includes(file.type)) {
      throw new Error('تنسيق الملف غير مدعوم. التنسيقات المدعومة: MP4, AVI, MKV, MOV, WMV, WebM');
    }
  }

  // توليد رمز الجلسة
  private static generateSessionToken(): string {
    return 'upload_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // حساب checksum
  private static async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // رفع القطعة إلى التخزين (محاكاة)
  private static async uploadChunkToStorage(
    videoFileId: string,
    chunkNumber: number,
    chunkData: ArrayBuffer
  ): Promise<string> {
    // في التطبيق الحقيقي، هذا سيرفع إلى S3 أو سيرفر ملفات
    const chunkPath = `/temp/uploads/${videoFileId}/chunk_${chunkNumber}`;
    
    // محاكاة الرفع
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return chunkPath;
  }

  // دمج القطع
  private static async mergeChunks(sessionId: string): Promise<string> {
    // في التطبيق الحقيقي، هذا سيدمج القطع الفعلية
    const mergedPath = `/temp/merged/${sessionId}.mp4`;
    
    // محاكاة الدمج
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mergedPath;
  }

  // استخراج معلومات الفيديو
  private static async extractVideoInfo(filePath: string): Promise<any> {
    // في التطبيق الحقيق��، هذا سيستخدم FFmpeg أو مكتبة مشابهة
    return {
      duration: 3600, // 1 hour
      width: 1920,
      height: 1080,
      bitrate: 5000,
      codec: 'h264'
    };
  }

  // تحويل الفيديو إلى جودة معينة
  private static async transcodeVideo(
    inputPath: string,
    quality: string,
    outputDir: string
  ): Promise<string> {
    // في التطبيق الحقيقي، هذ�� سيستخدم FFmpeg
    const outputPath = `${outputDir}/video_${quality}.mp4`;
    
    // محاكاة التحويل
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return outputPath;
  }

  // توليد الصور المصغرة
  private static async generateThumbnails(inputPath: string): Promise<string> {
    // في التطبيق الحقيقي، هذا سيولد صوراً مصغرة
    const thumbnailPath = `/thumbnails/thumb_${Date.now()}.jpg`;
    
    // محاكاة التوليد
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return thumbnailPath;
  }

  // الحصول على السيرفرات المتاحة
  private static async getAvailableServers(): Promise<any[]> {
    const { data: servers } = await supabase
      .from('internal_servers')
      .select('*')
      .eq('is_active', true)
      .order('priority');

    return servers || [];
  }

  // حفظ معلومات جودة الفيديو
  private static async saveVideoQuality(
    videoFileId: string,
    qualityInfo: any
  ): Promise<void> {
    await supabase
      .from('video_qualities')
      .insert({
        video_file_id: videoFileId,
        server_id: qualityInfo.server_id,
        quality: qualityInfo.quality,
        file_path: qualityInfo.file_path,
        file_size_bytes: qualityInfo.file_size_bytes,
        bitrate_kbps: qualityInfo.bitrate_kbps,
        codec: qualityInfo.codec,
        container_format: qualityInfo.container_format,
        is_ready: true
      });
  }

  // الحصول على حجم الملف
  private static async getFileSize(filePath: string): Promise<number> {
    // في التطبيق الحقيقي، هذا سيحصل على حجم الملف الفعلي
    return Math.floor(Math.random() * 1000000000); // محاكاة
  }

  // تسجيل النشاط
  private static async logActivity(
    videoFileId: string,
    activityType: string,
    details?: any
  ): Promise<void> {
    await supabase
      .from('video_activity_log')
      .insert({
        video_file_id: videoFileId,
        activity_type: activityType,
        details: details || {},
        ip_address: '127.0.0.1', // في التطبيق الحقيقي، سيتم الحصول على IP الفعلي
        user_agent: navigator.userAgent
      });
  }

  // الحصول على حالة الرفع
  static async getUploadStatus(sessionId: string): Promise<any> {
    const { data: session } = await supabase
      .from('upload_sessions')
      .select('*, video_files(*)')
      .eq('id', sessionId)
      .single();

    return session;
  }

  // إلغاء الرفع
  static async cancelUpload(sessionId: string): Promise<void> {
    try {
      // حذف القطع المرفوعة
      await supabase
        .from('upload_chunks')
        .delete()
        .eq('session_id', sessionId);

      // حذف الجلسة
      await supabase
        .from('upload_sessions')
        .delete()
        .eq('id', sessionId);

      // تحديث حالة الملف
      const { data: session } = await supabase
        .from('upload_sessions')
        .select('video_file_id')
        .eq('id', sessionId)
        .single();

      if (session) {
        await supabase
          .from('video_files')
          .update({ upload_status: 'failed' })
          .eq('id', session.video_file_id);
      }

    } catch (error) {
      console.error('Error canceling upload:', error);
      throw new Error('فشل في إلغاء عملية الرفع');
    }
  }
}
