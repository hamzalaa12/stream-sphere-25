import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ContentCard } from '@/components/content/ContentCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Content {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  release_date?: string;
  content_type: 'movie' | 'series' | 'anime';
  categories?: string[];
  language?: string;
  country?: string;
  is_netflix?: boolean;
  view_count?: number;
}

export default function CategoryPage() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const netflix = searchParams.get('netflix');
  const topRated = searchParams.get('top');
  
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, [category, type, netflix, topRated]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('content').select('*');
      
      // Filter by type
      if (type) {
        if (type === 'movie' || type === 'series' || type === 'anime') {
          query = query.eq('content_type', type);
        }
      }
      
      // Filter by category
      if (category) {
        if (category === 'foreign') {
          query = query.in('language', ['en', 'es', 'fr', 'de', 'it']);
        } else if (category === 'asian') {
          query = query.in('country', ['KR', 'JP', 'CN', 'TH', 'IN']);
        } else if (category === 'anime') {
          query = query.eq('content_type', 'anime');
        }
      }
      
      // Filter by Netflix
      if (netflix === 'true') {
        query = query.eq('is_netflix', true);
      }
      
      // Order by rating if top rated
      if (topRated === 'true') {
        query = query.order('rating', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error } = await query.limit(20);
      
      if (error) throw error;
      
      setContent(data || []);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحميل المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (type === 'movie') {
      if (category === 'foreign') return netflix ? 'أفلام نتفلكس الأجنبية' : topRated ? 'أفضل الأفلام الأجنبية' : 'الأفلام الأجنبية';
      if (category === 'asian') return netflix ? 'أفلام نتفلكس الآسيوية' : topRated ? 'أفضل الأفلام الآسيوية' : 'الأفلام الآسيوية';
      if (category === 'anime') return netflix ? 'أفلام الأنمي من نتفلكس' : topRated ? 'أفضل أفلام الأنمي' : 'أفلام الأنمي';
      return topRated ? 'أفضل الأفلام' : 'الأفلام';
    }
    
    if (type === 'series') {
      if (category === 'foreign') return netflix ? 'مسلسلات نتفلكس الأجنبية' : topRated ? 'أفضل المسلسلات الأجنبية' : 'المسلسلات الأجنبية';
      if (category === 'asian') return netflix ? 'مسلسلات نتفلكس الآسيوية' : topRated ? 'أفضل المسلسلات الآسيوية' : 'المسلسلات الآسيوية';
      return topRated ? 'أفضل المسلسلات' : 'المسلسلات';
    }
    
    if (type === 'anime' || category === 'anime') {
      return netflix ? 'أنمي نتفلكس' : topRated ? 'أفضل الأنمي' : 'قائمة الأنمي';
    }
    
    return 'المحتوى';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="container mx-auto py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-secondary rounded-lg mb-4"></div>
                <div className="h-4 bg-secondary rounded mb-2"></div>
                <div className="h-3 bg-secondary rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{getPageTitle()}</h1>
          <p className="text-muted-foreground">
            {content.length > 0 ? `تم العثور على ${content.length} عنصر` : 'لا توجد عناصر'}
          </p>
        </div>

        {content.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {content.map((item) => (
              <ContentCard 
                key={item.id}
                id={item.id}
                title={item.title}
                posterUrl={item.poster_url}
                rating={item.rating}
                year={item.release_date ? new Date(item.release_date).getFullYear() : undefined}
                type={item.content_type}
                categories={item.categories}
                viewCount={item.view_count}
                onClick={() => window.location.href = `/content/${item.id}`}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold mb-2">لا توجد عناصر</h3>
            <p className="text-muted-foreground">لم يتم العثور على محتوى في هذه الفئة</p>
          </div>
        )}
      </div>
    </div>
  );
}