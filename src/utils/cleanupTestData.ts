import { supabase } from '@/integrations/supabase/client';

/**
 * Utility to clean up test/experimental data from the database
 * يتم تنظيف البيانات التجريبية والاختبارية من قاعدة البيانات
 */

interface CleanupResult {
  success: boolean;
  message: string;
  deletedCounts: {
    content: number;
    episodes: number;
    streamingLinks: number;
    reviews: number;
  };
}

export const cleanupTestData = async (): Promise<CleanupResult> => {
  try {
    const deletedCounts = {
      content: 0,
      episodes: 0,
      streamingLinks: 0,
      reviews: 0,
    };

    // تحديد البيانات التجريبية بناءً على العناوين أو التصنيفات
    const testPatterns = [
      'test',
      'تجربة',
      'اختبار',
      'sample',
      'demo',
      'example',
      'مثال',
      'تجريبي',
      'فيلم الأكشن المثير', // من البيانات الوهمية السابقة
      'المغامرة الكبيرة',
      'مسلسل الجريمة',
      'الرومانسية الكورية',
      'أنمي المغامرة',
      'أنمي الرومانسية'
    ];

    // حذف المحتوى التجريبي
    const contentPattern = testPatterns.map(pattern => `%${pattern}%`);
    
    // البحث عن المحتوى التجريبي
    const { data: testContent, error: fetchError } = await supabase
      .from('content')
      .select('id, title, title_ar')
      .or(
        contentPattern.map(pattern => 
          `title.ilike.${pattern},title_ar.ilike.${pattern}`
        ).join(',')
      );

    if (fetchError) throw fetchError;

    if (testContent && testContent.length > 0) {
      const testContentIds = testContent.map(c => c.id);

      // حذف التقييمات المرتبطة
      const { error: reviewsError, count: reviewsCount } = await supabase
        .from('reviews')
        .delete()
        .in('content_id', testContentIds);

      if (!reviewsError && reviewsCount) {
        deletedCounts.reviews = reviewsCount;
      }

      // حذف روابط المشاهدة للحلقات المرتبطة
      const { data: testEpisodes } = await supabase
        .from('episodes')
        .select('id')
        .in('season_id', 
          (await supabase
            .from('seasons')
            .select('id')
            .in('content_id', testContentIds)).data?.map(s => s.id) || []
        );

      if (testEpisodes && testEpisodes.length > 0) {
        const testEpisodeIds = testEpisodes.map(e => e.id);
        
        const { error: linksError, count: linksCount } = await supabase
          .from('streaming_links')
          .delete()
          .in('episode_id', testEpisodeIds);

        if (!linksError && linksCount) {
          deletedCounts.streamingLinks = linksCount;
        }

        // حذف ال��لقات
        const { error: episodesError, count: episodesCount } = await supabase
          .from('episodes')
          .delete()
          .in('id', testEpisodeIds);

        if (!episodesError && episodesCount) {
          deletedCounts.episodes = episodesCount;
        }
      }

      // حذف المواسم (سيتم حذفها تلقائياً بسبب CASCADE)
      await supabase
        .from('seasons')
        .delete()
        .in('content_id', testContentIds);

      // حذف المحتوى التجريبي
      const { error: contentError, count: contentCount } = await supabase
        .from('content')
        .delete()
        .in('id', testContentIds);

      if (!contentError && contentCount) {
        deletedCounts.content = contentCount;
      }
    }

    // حذف الحلقات التجريبية المنفردة (بدون محتوى مرتبط)
    const { data: orphanEpisodes, error: orphanError } = await supabase
      .from('episodes')
      .select('id')
      .or(
        contentPattern.map(pattern => 
          `title.ilike.${pattern}`
        ).join(',')
      );

    if (orphanEpisodes && orphanEpisodes.length > 0) {
      const orphanIds = orphanEpisodes.map(e => e.id);
      
      // حذف روابط المشاهدة للحلقات المنفردة
      await supabase
        .from('streaming_links')
        .delete()
        .in('episode_id', orphanIds);

      // حذف الحلقات المنفردة
      await supabase
        .from('episodes')
        .delete()
        .in('id', orphanIds);
    }

    // حذف روابط المشاهدة التجريبية (التي قد تحتوي على أسماء سيرفرات تجريبية)
    const { error: testLinksError } = await supabase
      .from('streaming_links')
      .delete()
      .or(
        contentPattern.map(pattern => 
          `server_name.ilike.${pattern},streaming_url.ilike.${pattern}`
        ).join(',')
      );

    return {
      success: true,
      message: `تم تنظيف البيانات التجريبية بنجاح. تم حذف ${deletedCounts.content} محتوى، ${deletedCounts.episodes} حلقة، ${deletedCounts.streamingLinks} رابط، ${deletedCounts.reviews} تقييم`,
      deletedCounts
    };

  } catch (error: any) {
    console.error('Error cleaning up test data:', error);
    return {
      success: false,
      message: `فشل في تنظيف البيانات: ${error.message}`,
      deletedCounts: {
        content: 0,
        episodes: 0,
        streamingLinks: 0,
        reviews: 0,
      }
    };
  }
};

/**
 * Clean up content with very low ratings or view counts (likely test data)
 * تنظيف المحتوى ذو التقييمات أو المشاهدات المنخفضة جداً (غالباً بيانات تجريبية)
 */
export const cleanupLowQualityContent = async (): Promise<CleanupResult> => {
  try {
    const deletedCounts = {
      content: 0,
      episodes: 0,
      streamingLinks: 0,
      reviews: 0,
    };

    // حذف المحتوى بتقييم 0 أو مشاهدات أقل من 10 (غالباً بيانات تجريبية)
    const { data: lowQualityContent, error: fetchError } = await supabase
      .from('content')
      .select('id')
      .or('rating.eq.0,view_count.lt.10')
      .not('title', 'is', null); // تأكد من وجود عنوان

    if (fetchError) throw fetchError;

    if (lowQualityContent && lowQualityContent.length > 0) {
      const contentIds = lowQualityContent.map(c => c.id);

      // حذف البيانات المرتبطة أولاً
      await supabase.from('reviews').delete().in('content_id', contentIds);
      
      const { data: seasons } = await supabase
        .from('seasons')
        .select('id')
        .in('content_id', contentIds);

      if (seasons && seasons.length > 0) {
        const seasonIds = seasons.map(s => s.id);
        const { data: episodes } = await supabase
          .from('episodes')
          .select('id')
          .in('season_id', seasonIds);

        if (episodes && episodes.length > 0) {
          const episodeIds = episodes.map(e => e.id);
          await supabase.from('streaming_links').delete().in('episode_id', episodeIds);
          const { count: episodesCount } = await supabase
            .from('episodes')
            .delete()
            .in('id', episodeIds);
          deletedCounts.episodes = episodesCount || 0;
        }
      }

      // حذف المحتوى
      const { count: contentCount } = await supabase
        .from('content')
        .delete()
        .in('id', contentIds);

      deletedCounts.content = contentCount || 0;
    }

    return {
      success: true,
      message: `تم تنظيف المحتوى منخفض الجودة. تم حذف ${deletedCounts.content} محتوى و ${deletedCounts.episodes} حلقة`,
      deletedCounts
    };

  } catch (error: any) {
    console.error('Error cleaning up low quality content:', error);
    return {
      success: false,
      message: `فشل في تنظيف المحتوى منخفض الجودة: ${error.message}`,
      deletedCounts: {
        content: 0,
        episodes: 0,
        streamingLinks: 0,
        reviews: 0,
      }
    };
  }
};
