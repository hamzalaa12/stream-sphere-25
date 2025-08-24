/**
 * Comprehensive error handling utilities for the application
 * أدوات شاملة للتعامل مع الأخطاء في التطبيق
 */

export interface FormattedError {
  title: string;
  description: string;
  technical: string;
}

/**
 * Extract meaningful error message from various error types
 * استخراج رسالة خطأ مفهومة من أنواع الأخطاء المختلفة
 */
export const formatError = (error: any, context: string = 'عملية'): FormattedError => {
  let errorMessage = 'حدث خطأ غير معروف';
  let technicalDetails = '';

  try {
    // Handle different error types
    if (typeof error === 'string') {
      errorMessage = error;
      technicalDetails = error;
    } else if (error && typeof error === 'object') {
      // Extract from Supabase errors
      if (error.message) {
        errorMessage = error.message;
        technicalDetails = error.message;
      } else if (error.details) {
        errorMessage = error.details;
        technicalDetails = error.details;
      } else if (error.hint) {
        errorMessage = error.hint;
        technicalDetails = error.hint;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
        technicalDetails = error.error.message;
      }

      // Add error code if available
      if (error.code) {
        technicalDetails += ` (كود الخطأ: ${error.code})`;
      }

      // Handle PostgreSQL errors
      if (error.code === '23505' || errorMessage.includes('duplicate key')) {
        errorMessage = 'يوجد عنصر بنفس البيانات مسبقاً';
      } else if (error.code === '23503' || errorMessage.includes('foreign key')) {
        errorMessage = 'خطأ في البيانات المرتبطة - يرجى التحقق من صحة المعلومات';
      } else if (error.code === '23514' || errorMessage.includes('check constraint')) {
        errorMessage = 'قيم غير صالحة في البيانات المدخلة';
      } else if (error.code === '42703' || errorMessage.includes('does not exist')) {
        errorMessage = 'خطأ في بنية البيانات - يرجى إبلاغ المطور';
      } else if (error.code === '42P01' || errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        errorMessage = 'جدول البيانات غير موجود - يرجى إبلاغ المطور';
      }

      // Handle validation errors
      if (errorMessage.includes('invalid input') || errorMessage.includes('invalid value')) {
        errorMessage = 'بيانات غير صالحة - يرجى التحقق من المعلومات المدخلة';
      }

      // Handle network errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage = 'خطأ في الاتصال - يرجى التحقق من الإنترنت والمحاولة مرة أخرى';
      }

      // Handle authentication errors
      if (errorMessage.includes('not authenticated') || errorMessage.includes('unauthorized')) {
        errorMessage = 'غير مسموح - يرجى تسجيل الدخول مرة أخرى';
      }

      // If still object-like, convert to string
      if (typeof error === 'object' && !errorMessage) {
        technicalDetails = JSON.stringify(error, null, 2);
        errorMessage = 'حدث خطأ تقني - يرجى إبلاغ المطور';
      }
    }
  } catch (e) {
    errorMessage = 'حدث خطأ في معالجة الخطأ';
    technicalDetails = 'Error processing error object';
  }

  return {
    title: `خطأ في ${context}`,
    description: errorMessage,
    technical: technicalDetails
  };
};

/**
 * Database-specific error handler
 * معالج الأخطاء الخاص بقاعدة البيانات
 */
export const formatDatabaseError = (error: any, operation: string = 'حفظ البيانات'): FormattedError => {
  const baseError = formatError(error, operation);
  
  // Add more database-specific handling
  let { description } = baseError;
  
  if (error?.code) {
    switch (error.code) {
      case '23505':
        description = 'العنصر موجود مسبقاً - يرجى استخدام بيانات مختلفة';
        break;
      case '23503':
        description = 'خطأ في العلاقات - العنصر المرجع غير موجود';
        break;
      case '23514':
        description = 'البيانات لا تتوافق مع القواعد المحددة';
        break;
      case '42703':
        description = 'حقل غير موجود في قاعدة البيانات';
        break;
      case '42P01':
        description = 'جدول غير موجود في قاعدة البيانات';
        break;
      case '22P02':
        description = 'نوع البيانات غير صحيح';
        break;
      case '23502':
        description = 'حقل مطلوب لم يتم ملؤه';
        break;
    }
  }

  return {
    ...baseError,
    description
  };
};

/**
 * Content-specific error handler
 * معالج الأخطاء الخاص بالمحتوى
 */
export const formatContentError = (error: any): FormattedError => {
  const baseError = formatDatabaseError(error, 'حفظ المحتوى');
  
  // Add content-specific error handling
  if (baseError.technical.includes('title')) {
    return {
      ...baseError,
      description: 'خطأ في عنوان المحتوى - يرجى التأكد من إدخال عنوان صحيح'
    };
  }
  
  if (baseError.technical.includes('content_type')) {
    return {
      ...baseError,
      description: 'نوع المحتوى غير صحيح - يرجى اختيار نوع صحيح'
    };
  }
  
  if (baseError.technical.includes('categories')) {
    return {
      ...baseError,
      description: 'فئة المحتوى غير صحيحة - يرجى اختيار فئة مدعومة'
    };
  }
  
  return baseError;
};

/**
 * Log error for debugging while showing user-friendly message
 * تسجيل الخطأ للتطوير مع إظهار رسالة مفهومة للمستخدم
 */
export const logAndFormatError = (error: any, context: string, showTechnical: boolean = false): FormattedError => {
  const formatted = formatError(error, context);
  
  // Log technical details for debugging
  console.error(`Error in ${context}:`, {
    error,
    formatted,
    timestamp: new Date().toISOString()
  });
  
  // Return user-friendly or technical version based on flag
  if (showTechnical) {
    return {
      ...formatted,
      description: `${formatted.description}\n\nتفاصيل تقنية: ${formatted.technical}`
    };
  }
  
  return formatted;
};
