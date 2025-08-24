/**
 * Specialized error handling for video upload operations
 * معالجة متخصصة لأخطاء عمليات رفع الفيديو
 */

export interface UploadError {
  type: 'session_expired' | 'chunk_failed' | 'network_error' | 'storage_full' | 'file_too_large' | 'unsupported_format' | 'unknown';
  message: string;
  details: string;
  retryable: boolean;
  chunkNumber?: number;
  sessionId?: string;
}

/**
 * Parse and categorize upload errors
 * تحليل وتصنيف أخطاء الرفع
 */
export const parseUploadError = (error: any, context?: { chunkNumber?: number; sessionId?: string }): UploadError => {
  let errorType: UploadError['type'] = 'unknown';
  let message = 'حدث خطأ غير معروف في الرفع';
  let details = '';
  let retryable = true;

  // Extract error message
  if (typeof error === 'string') {
    details = error;
  } else if (error?.message) {
    details = error.message;
  } else if (error?.error?.message) {
    details = error.error.message;
  } else {
    details = JSON.stringify(error);
  }

  // Categorize error types
  if (details.includes('انتهت صلاحية جلسة الرفع') || details.includes('session expired')) {
    errorType = 'session_expired';
    message = 'انتهت صلاحية جلسة الرفع';
    retryable = true;
  } else if (details.includes('فشل في رفع القطعة') || details.includes('chunk upload failed')) {
    errorType = 'chunk_failed';
    message = `فشل في رفع القطعة ${context?.chunkNumber ? context.chunkNumber + 1 : ''}`;
    retryable = true;
  } else if (details.includes('network') || details.includes('fetch') || details.includes('connection')) {
    errorType = 'network_error';
    message = 'خطأ في الشبكة - يرجى التحقق من الاتصال';
    retryable = true;
  } else if (details.includes('storage full') || details.includes('disk full') || details.includes('no space')) {
    errorType = 'storage_full';
    message = 'مساحة التخزين ممتلئة - يرجى المحاولة لاحقاً';
    retryable = false;
  } else if (details.includes('file too large') || details.includes('حجم الملف كبير')) {
    errorType = 'file_too_large';
    message = 'حجم الملف كبير جداً - الحد الأقصى 10GB';
    retryable = false;
  } else if (details.includes('unsupported format') || details.includes('تنسيق غير مدعوم')) {
    errorType = 'unsupported_format';
    message = 'تنسيق الملف غير مدعوم';
    retryable = false;
  }

  return {
    type: errorType,
    message,
    details,
    retryable,
    chunkNumber: context?.chunkNumber,
    sessionId: context?.sessionId
  };
};

/**
 * Get user-friendly error message with action suggestions
 * الحصول على رسالة خطأ واضحة مع اقتراحات للحلول
 */
export const getUploadErrorMessage = (uploadError: UploadError): { title: string; description: string; action?: string } => {
  switch (uploadError.type) {
    case 'session_expired':
      return {
        title: 'انتهت صلاحية الجلسة',
        description: 'انتهت صلاحية جلسة الرفع. سيتم تجديد الجلسة والمتابعة تلقائياً.',
        action: 'جاري المحاولة مرة أخرى...'
      };

    case 'chunk_failed':
      return {
        title: 'فشل في رفع جزء من الملف',
        description: `فشل في رفع القطعة ${uploadError.chunkNumber ? uploadError.chunkNumber + 1 : ''}. سيتم إعادة المحاولة تلقائياً.`,
        action: 'جاري إعادة المحاولة...'
      };

    case 'network_error':
      return {
        title: 'خطأ في الشبكة',
        description: 'يبدو أن هناك مشكلة في الاتصال بالإنترنت.',
        action: 'يرجى التحقق من الاتصال والمحاولة مرة أخرى'
      };

    case 'storage_full':
      return {
        title: 'مساحة التخزين ممتلئة',
        description: 'مساحة التخزين على السيرفر ممتلئة حالياً.',
        action: 'يرجى المحاولة لاحقاً أو الاتصال بالدعم الفني'
      };

    case 'file_too_large':
      return {
        title: 'الملف كبير جداً',
        description: 'حجم الملف يتجاوز الحد الأقصى المسموح (10GB).',
        action: 'يرجى ضغط الملف أو تقسيمه إلى أجزاء أصغر'
      };

    case 'unsupported_format':
      return {
        title: 'تنسيق غير مدعوم',
        description: 'تنسيق الملف غير مدعوم. التنسيقات المدعومة: MP4, AVI, MKV, MOV, WMV, WebM.',
        action: 'يرجى تحويل الملف إلى تنسيق مدعوم'
      };

    default:
      return {
        title: 'خطأ في الرفع',
        description: uploadError.message || 'حدث خطأ غير متوقع أثناء رفع الملف.',
        action: uploadError.retryable ? 'يرجى المحاولة مرة أخرى' : 'يرجى الاتصال بالدعم الفني'
      };
  }
};

/**
 * Determine if an error warrants automatic retry
 * تحديد ما إذا كان الخطأ يستدعي إعادة المحاولة تلقائياً
 */
export const shouldRetryUpload = (uploadError: UploadError, currentRetryCount: number, maxRetries: number = 3): boolean => {
  if (!uploadError.retryable || currentRetryCount >= maxRetries) {
    return false;
  }

  // بعض الأخطاء تستدعي إعادة المحاولة فوراً
  const immediateRetryTypes: UploadError['type'][] = ['session_expired', 'chunk_failed', 'network_error'];
  
  return immediateRetryTypes.includes(uploadError.type);
};

/**
 * Calculate retry delay based on error type and attempt count
 * حساب تأخير إعادة المحاولة حسب نوع الخطأ وعدد المحاولات
 */
export const getRetryDelay = (uploadError: UploadError, retryCount: number): number => {
  const baseDelay = 1000; // 1 second
  
  switch (uploadError.type) {
    case 'session_expired':
      return baseDelay; // إعادة محاولة فورية تقريباً
      
    case 'chunk_failed':
      return baseDelay * Math.pow(2, retryCount); // Exponential backoff
      
    case 'network_error':
      return baseDelay * (retryCount + 1) * 2; // Linear increase
      
    default:
      return baseDelay * Math.pow(2, retryCount); // Default exponential backoff
  }
};

/**
 * Log upload error for debugging and monitoring
 * تسجيل خطأ الرفع للتطوير والمراقبة
 */
export const logUploadError = (uploadError: UploadError, sessionId?: string, additionalContext?: any): void => {
  const logData = {
    timestamp: new Date().toISOString(),
    errorType: uploadError.type,
    message: uploadError.message,
    details: uploadError.details,
    sessionId: sessionId || uploadError.sessionId,
    chunkNumber: uploadError.chunkNumber,
    retryable: uploadError.retryable,
    additionalContext
  };

  // Log to console for development
  console.error('Upload Error:', logData);

  // In production, you might want to send this to a logging service
  // logToService(logData);
};
