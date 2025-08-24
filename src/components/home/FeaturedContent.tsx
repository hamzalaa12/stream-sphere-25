import { useState, useEffect } from 'react';
import { ContentSection } from '@/components/content/ContentSection';
import { ContentCard } from '@/components/content/ContentCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentItem {
  id: string;
  title: string;
  title_ar?: string;
  type: 'movie' | 'series' | 'anime';
  rating: number;
  year: number;
  categories: string[];
  viewCount: number;
  poster_url?: string;
  backdrop_url?: string;
}

interface Episode {
  id: string;
  title?: string;
  episode_number: number;
  view_count: number;
  created_at: string;
  thumbnail_url?: string;
  season: {
    season_number: number;
    content: {
      id: string;
      title: string;
      title_ar?: string;
      content_type: string;
      poster_url?: string;
      rating: number;
      categories: string[];
    };
  };
}

export const FeaturedContent = () => {
  const { toast } = useToast();
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [series, setSeries] = useState<ContentItem[]>([]);
  const [anime, setAnime] = useState<ContentItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // جلب الأفلام
      const { data: moviesData, error: moviesError } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'movie')
        .order('created_at', { ascending: false })
        .limit(12);

      if (moviesError) throw moviesError;

      // جلب المسلسلات
      const { data: seriesData, error: seriesError } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'series')
        .order('created_at', { ascending: false })
        .limit(12);

      if (seriesError) throw seriesError;

      // جلب الأنمي
      const { data: animeData, error: animeError } = await supabase
        .from('content')
        .select('*')
        .eq('content_type', 'anime')
        .order('created_at', { ascending: false })
        .limit(12);

      if (animeError) throw animeError;

      // جلب أحدث الحلقات
      const { data: episodesData, error: episodesError } = await supabase
        .from('episodes')
        .select(`
          *,
          season:seasons(
            season_number,
            content:content(
              id, title, title_ar, content_type, poster_url, rating, categories
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(12);

      if (episodesError) throw episodesError;

      // تحويل البيانات إلى التنسيق المطلوب
      const formatContent = (data: any[]): ContentItem[] => {
        return data.map(item => ({
          id: item.id,
          title: item.title_ar || item.title || 'بدون عنوان',
          title_ar: item.title_ar,
          type: item.content_type,
          rating: item.rating || 0,
          year: item.release_date ? new Date(item.release_date).getFullYear() : new Date().getFullYear(),
          categories: item.categories || [],
          viewCount: item.view_count || 0,
          poster_url: item.poster_url,
          backdrop_url: item.backdrop_url
        }));
      };

      setMovies(formatContent(moviesData || []));
      setSeries(formatContent(seriesData || []));
      setAnime(formatContent(animeData || []));
      setEpisodes(episodesData || []);

    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabels = (categories: string[]) => {
    const categoryMap: Record<string, string> = {
      'action': 'أكشن',
      'drama': 'دراما',
      'comedy': 'كوميديا',
      'romance': 'رومانسي',
      'thriller': 'إثارة',
      'horror': 'رعب',
      'sci-fi': 'خيال علمي',
      'fantasy': 'فانتازيا',
      'documentary': 'وثائقي',
      'animation': 'رسوم متحركة'
    };

    return categories?.map(cat => categoryMap[cat] || cat) || [];
  };

  if (loading) {
    return (
      <div className="bg-background-secondary py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل المحتوى...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-background-secondary">
      {/* أحدث الأفلام */}
      {movies.length > 0 && (
        <ContentSection
          title="أحدث الأفلام"
          showViewAll
          onViewAll={() => window.location.href = '/category/movies'}
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none w-48">
              <ContentCard
                {...movie}
                categories={getCategoryLabels(movie.categories)}
                onClick={() => window.location.href = `/content/${movie.id}`}
              />
            </div>
          ))}
        </ContentSection>
      )}

      {/* أحدث المسلسلات */}
      {series.length > 0 && (
        <ContentSection
          title="أحدث المسلسلات"
          showViewAll
          onViewAll={() => window.location.href = '/category/series'}
        >
          {series.map((seriesItem) => (
            <div key={seriesItem.id} className="flex-none w-48">
              <ContentCard
                {...seriesItem}
                categories={getCategoryLabels(seriesItem.categories)}
                onClick={() => window.location.href = `/content/${seriesItem.id}`}
              />
            </div>
          ))}
        </ContentSection>
      )}

      {/* أحدث الحلقات */}
      {episodes.length > 0 && (
        <ContentSection
          title="أحدث الحلقات"
          showViewAll
          onViewAll={() => window.location.href = '/episodes'}
        >
          {episodes.map((episode) => (
            <div key={episode.id} className="flex-none w-48">
              <ContentCard
                id={episode.season.content.id}
                title={`${episode.season.content.title_ar || episode.season.content.title} - س${episode.season.season_number} ح${episode.episode_number}`}
                title_ar={episode.title}
                type={episode.season.content.content_type as 'series' | 'anime'}
                rating={episode.season.content.rating}
                year={new Date().getFullYear()}
                categories={getCategoryLabels(episode.season.content.categories)}
                viewCount={episode.view_count || 0}
                poster_url={episode.thumbnail_url || episode.season.content.poster_url}
                onClick={() => window.location.href = `/content/${episode.season.content.id}`}
              />
            </div>
          ))}
        </ContentSection>
      )}

      {/* أحدث الأنمي */}
      {anime.length > 0 && (
        <ContentSection
          title="أحدث الأنمي"
          showViewAll
          onViewAll={() => window.location.href = '/category/anime'}
        >
          {anime.map((animeItem) => (
            <div key={animeItem.id} className="flex-none w-48">
              <ContentCard
                {...animeItem}
                categories={getCategoryLabels(animeItem.categories)}
                onClick={() => window.location.href = `/content/${animeItem.id}`}
              />
            </div>
          ))}
        </ContentSection>
      )}

      {/* Featured Section - المحتوى المميز في الوسط */}
      {(movies.length > 0 || series.length > 0 || anime.length > 0) && (
        <ContentSection
          title="⭐ المحتوى المميز"
          showViewAll
          onViewAll={() => window.location.href = '/featured'}
        >
          {[...movies, ...series, ...anime]
            .filter(content => content.rating >= 8.0)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10)
            .map((content) => (
              <div key={content.id} className="flex-none w-48">
                <ContentCard
                  {...content}
                  categories={getCategoryLabels(content.categories)}
                  onClick={() => window.location.href = `/content/${content.id}`}
                />
              </div>
            ))
          }
        </ContentSection>
      )}

      {/* الأعلى تقييماً */}
      {(movies.length > 0 || series.length > 0 || anime.length > 0) && (
        <ContentSection
          title="🏆 الأعلى تقييماً"
          showViewAll
          onViewAll={() => window.location.href = '/top-rated'}
        >
          {[...movies, ...series, ...anime]
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 10)
            .map((content) => (
              <div key={content.id} className="flex-none w-48">
                <ContentCard
                  {...content}
                  categories={getCategoryLabels(content.categories)}
                  onClick={() => window.location.href = `/content/${content.id}`}
                />
              </div>
            ))
          }
        </ContentSection>
      )}

      {/* الأكثر مشاهدة */}
      {(movies.length > 0 || series.length > 0 || anime.length > 0) && (
        <ContentSection
          title="🔥 الأكثر مشاهدة"
          showViewAll
          onViewAll={() => window.location.href = '/popular'}
        >
          {[...movies, ...series, ...anime]
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 10)
            .map((content) => (
              <div key={content.id} className="flex-none w-48">
                <ContentCard
                  {...content}
                  categories={getCategoryLabels(content.categories)}
                  onClick={() => window.location.href = `/content/${content.id}`}
                />
              </div>
            ))
          }
        </ContentSection>
      )}

      {/* Empty state */}
      {movies.length === 0 && series.length === 0 && anime.length === 0 && (
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">لا يوجد محتوى متاح حالياً</h3>
            <p className="text-muted-foreground mb-6">
              لم يتم إضافة أي محتوى بعد. يرجى التحقق مرة أخرى لاحقاً.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
