import React, { useState, useEffect } from 'react';
import { ContentCard } from '@/components/content/ContentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Flame, Star, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface TrendingContent {
  id: string;
  title: string;
  title_ar?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  view_count: number;
  release_date?: string;
}

export const TrendingSection = () => {
  const navigate = useNavigate();
  const [trendingContent, setTrendingContent] = useState<TrendingContent[]>([]);
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingContent();
  }, [timeframe]);

  const fetchTrendingContent = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on timeframe
      const now = new Date();
      const dateThreshold = new Date();
      
      switch (timeframe) {
        case 'day':
          dateThreshold.setDate(now.getDate() - 1);
          break;
        case 'week':
          dateThreshold.setDate(now.getDate() - 7);
          break;
        case 'month':
          dateThreshold.setMonth(now.getMonth() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .gte('created_at', dateThreshold.toISOString())
        .order('view_count', { ascending: false })
        .limit(12);

      if (error) throw error;
      setTrendingContent(data || []);
    } catch (error) {
      console.error('Error fetching trending content:', error);
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

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case 'day': return 'اليوم';
      case 'week': return 'هذا الأسبوع';
      case 'month': return 'هذا الشهر';
      default: return 'هذا الأسبوع';
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-background-secondary/50">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-[2/3] bg-muted rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background-secondary/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="h-6 w-6" />
                <h2 className="text-3xl lg:text-4xl font-bold">المحتوى الرائج</h2>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Fire className="h-3 w-3 mr-1" />
                {getTimeframeLabel(timeframe)}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              أكثر المحتوى مشاهدة ومناقشة حالياً
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(tf)}
                className="transition-all duration-300"
              >
                {getTimeframeLabel(tf)}
              </Button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {trendingContent.length > 0 ? (
          <>
            {/* Top 3 - Featured */}
            <div className="grid lg:grid-cols-3 gap-8 mb-12">
              {trendingContent.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className="group relative animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Rank Badge */}
                  <div className="absolute -top-4 -right-4 z-10">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                      'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="relative group-hover:scale-105 transition-transform duration-300">
                    <ContentCard
                      id={item.id}
                      title={item.title}
                      title_ar={item.title_ar}
                      poster_url={item.poster_url}
                      backdrop_url={item.backdrop_url}
                      rating={item.rating}
                      year={item.release_date ? new Date(item.release_date).getFullYear() : undefined}
                      type={item.content_type}
                      categories={getCategoryLabels(item.categories)}
                      viewCount={item.view_count}
                      onClick={() => navigate(`/content/${item.id}`)}
                    />

                    {/* Trending stats overlay */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="bg-black/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-400" />
                            <span>+{Math.floor(Math.random() * 50 + 10)}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span>{item.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rest of content - Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {trendingContent.slice(3).map((item, index) => (
                <div
                  key={item.id}
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                >
                  <ContentCard
                    id={item.id}
                    title={item.title}
                    title_ar={item.title_ar}
                    poster_url={item.poster_url}
                    backdrop_url={item.backdrop_url}
                    rating={item.rating}
                    year={item.release_date ? new Date(item.release_date).getFullYear() : undefined}
                    type={item.content_type}
                    categories={getCategoryLabels(item.categories)}
                    viewCount={item.view_count}
                    onClick={() => navigate(`/content/${item.id}`)}
                  />
                </div>
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center mt-12">
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/trending')}
                className="group transition-all duration-300 hover:scale-105"
              >
                عرض جميع المحتوى الرائج
                <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-4">
              <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">لا يوجد محتوى رائج حالياً</h3>
              <p className="text-muted-foreground">
                ستظهر هنا أكثر المحتوى مشاهدة خلال {getTimeframeLabel(timeframe)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </section>
  );
};
