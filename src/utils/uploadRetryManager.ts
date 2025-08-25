/**
 * Upload retry manager for handling failed chunks and session recovery
 * مدير إعادة المحاولة للرفع للتعامل مع القطع الفاشلة واستعادة الجلسة
 */

import { VideoUploadService } from '@/services/VideoUploadService';
import { parseUploadError, shouldRetryUpload, getRetryDelay, logUploadError } from './uploadErrorHandling';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export interface ChunkUploadResult {
  success: boolean;
  error?: string;
  shouldRetry: boolean;
  retryAfter?: number;
}

export class UploadRetryManager {
  private static defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    exponentialBackoff: true
  };

  private retryCount = new Map<number, number>(); // chunkNumber -> retryCount
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...UploadRetryManager.defaultConfig, ...config };
  }

  /**
   * Attempt to upload a chunk with retry logic
   * محاولة رفع قطعة مع منطق إعادة المحاولة
   */
  async uploadChunkWithRetry(
    sessionId: string,
    chunkNumber: number,
    chunkData: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<ChunkUploadResult> {
    const currentRetryCount = this.retryCount.get(chunkNumber) || 0;

    try {
      const success = await VideoUploadService.uploadChunk(
        sessionId,
        chunkNumber,
        chunkData,
        onProgress
      );

      if (success) {
        // نجح الرفع، أزل عداد إعادة المحاولة
        this.retryCount.delete(chunkNumber);
        return { success: true };
      } else {
        throw new Error('Upload returned false');
      }

    } catch (error) {
      const uploadError = parseUploadError(error, { chunkNumber, sessionId });
      
      logUploadError(uploadError, sessionId, {
        chunkNumber,
        retryCount: currentRetryCount,
        maxRetries: this.config.maxRetries
      });

      // تحديد ما إذا كان يجب إعادة المحاولة
      const shouldRetry = shouldRetryUpload(uploadError, currentRetryCount, this.config.maxRetries);
      
      if (shouldRetry) {
        const newRetryCount = currentRetryCount + 1;
        this.retryCount.set(chunkNumber, newRetryCount);
        
        const retryDelay = this.calculateRetryDelay(uploadError, newRetryCount);
        
        return {
          success: false,
          error: uploadError.message,
          shouldRetry: true,
          retryAfter: retryDelay
        };
      } else {
        // لا يمكن إعادة المحاولة
        this.retryCount.delete(chunkNumber);
        return {
          success: false,
          error: uploadError.message,
          shouldRetry: false
        };
      }
    }
  }

  /**
   * Calculate retry delay based on error type and attempt count
   * حساب تأخير إعادة المحاولة بناءً على نوع الخطأ وعدد المحاولات
   */
  private calculateRetryDelay(uploadError: any, retryCount: number): number {
    let delay = getRetryDelay(uploadError, retryCount - 1);
    
    if (this.config.exponentialBackoff) {
      delay = Math.min(delay * Math.pow(2, retryCount - 1), this.config.maxDelay);
    } else {
      delay = Math.min(this.config.baseDelay * retryCount, this.config.maxDelay);
    }
    
    return delay;
  }

  /**
   * Get chunks that need to be retried
   * الحصول على القطع التي تحتاج إعادة محاولة
   */
  getChunksToRetry(): number[] {
    return Array.from(this.retryCount.keys()).sort((a, b) => a - b);
  }

  /**
   * Reset retry count for a specific chunk
   * إعادة تعيين عداد إعادة المحاولة لقطعة محددة
   */
  resetChunkRetry(chunkNumber: number): void {
    this.retryCount.delete(chunkNumber);
  }

  /**
   * Reset all retry counts
   * إعادة تعيين جميع عدادات إعادة المحاولة
   */
  resetAllRetries(): void {
    this.retryCount.clear();
  }

  /**
   * Get retry count for a specific chunk
   * الحصول على عداد إعادة المحاولة لقطعة محددة
   */
  getRetryCount(chunkNumber: number): number {
    return this.retryCount.get(chunkNumber) || 0;
  }

  /**
   * Check if a chunk has exceeded max retries
   * فحص ما إذا كانت قطعة قد تجاوزت الحد الأقصى لإعادة المحاولة
   */
  hasExceededMaxRetries(chunkNumber: number): boolean {
    return this.getRetryCount(chunkNumber) >= this.config.maxRetries;
  }

  /**
   * Resume upload from last successful chunk
   * استئناف الرفع من آخر قطعة ناجحة
   */
  async findResumePoint(sessionId: string, totalChunks: number): Promise<number> {
    try {
      return await VideoUploadService.resumeUpload(sessionId);
    } catch (error) {
      console.error('Error finding resume point:', error);
      return 0; // البداية من الصفر في حالة الخطأ
    }
  }

  /**
   * Validate session and refresh if needed
   * التحقق من صحة الجلسة وتجديدها إذا لزم الأمر
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      await VideoUploadService.validateAndRefreshSession(sessionId);
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Get upload statistics
   * الحصول على إحصائيات الرفع
   */
  getUploadStats(): {
    totalRetries: number;
    chunksWithRetries: number;
    averageRetriesPerChunk: number;
  } {
    const retryValues = Array.from(this.retryCount.values());
    const totalRetries = retryValues.reduce((sum, count) => sum + count, 0);
    const chunksWithRetries = retryValues.length;
    const averageRetriesPerChunk = chunksWithRetries > 0 ? totalRetries / chunksWithRetries : 0;

    return {
      totalRetries,
      chunksWithRetries,
      averageRetriesPerChunk
    };
  }
}

/**
 * Global retry manager instance
 * مثيل مدير إعادة المحاولة العام
 */
let globalRetryManager: UploadRetryManager | null = null;

export const getRetryManager = (config?: Partial<RetryConfig>): UploadRetryManager => {
  if (!globalRetryManager || config) {
    globalRetryManager = new UploadRetryManager(config);
  }
  return globalRetryManager;
};

export const resetRetryManager = (): void => {
  globalRetryManager = null;
};
