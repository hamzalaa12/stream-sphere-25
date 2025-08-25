import React, { useState, useEffect, useRef } from 'react';
import { ContentCard } from '@/components/content/ContentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Filter, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface NewRelease {
  id: string;
  title: string;
  title_ar?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  view_count: number;
  release_date?: string;
  created_at: string;
}

export const NewReleasesSection = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newReleases, setNewReleases] = useState<NewRelease[]>([]);
  const [filteredReleases, setFilteredReleases] = useState<NewRelease[]>([]);
  const [selectedType, setSelectedType] = useState<'all' | 'movie' | 'series' | 'anime'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNewReleases();
  }, []);

  useEffect(() => {
    filterReleases();
  }, [newReleases, selectedType]);

  const fetchNewReleases = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNewReleases(data || []);
    } catch (error) {
      console.error('Error fetching new releases:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReleases = () => {
    if (selectedType === 'all') {
      setFilteredReleases(newReleases);
    } else {
      setFilteredReleases(newReleases.filter(item => item.content_type === selectedType));
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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320; // Width of one card + gap
      const newScrollLeft = direction === 'left' 
        ? scrollRef.current.scrollLeft - scrollAmount
        : scrollRef.current.scrollLeft + scrollAmount;
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'أفلام';
      case 'series': return 'مسلسلات';
      case 'anime': return 'أنمي';
      default: return 'الكل';
    }
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'منذ يوم';
    if (diffDays <= 7) return `منذ ${diffDays} أيام`;
    if (diffDays <= 30) return `منذ ${Math.ceil(diffDays / 7)} أسابيع`;
    return `منذ ${Math.ceil(diffDays / 30)} شهر`;
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 bg-muted rounded"></div>
                ))}
              </div>
            </div>
            <div className="flex gap-6 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-none w-72 space-y-4">
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
    <section className="py-16 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-40 right-20 w-32 h-32 bg-accent/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-20 left-40 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-accent" />
              <h2 className="text-3xl lg:text-4xl font-bold">الإضافات الجديدة</h2>
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                <Calendar className="h-3 w-3 mr-1" />
                آخر 30 يوم
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              آخر ما تم إضافته من أفلام ومسلسلات وأنمي
            </p>
          </div>

          {/* Navigation & Filters */}
          <div className="flex items-center gap-4">
            {/* Type Filter */}
            <div className="flex gap-2">
              {(['all', 'movie', 'series', 'anime'] as const).map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="transition-all duration-300"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  {getTypeLabel(type)}
                </Button>
              ))}
            </div>

            {/* Scroll Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('left')}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scroll('right')}
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Carousel */}
        {filteredReleases.length > 0 ? (
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredReleases.map((item, index) => (
                <div
                  key={item.id}
                  className="flex-none w-72 group animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* New Badge */}
                  <div className="relative mb-4">
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

                    {/* New Release Badge */}
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-gradient-to-r from-accent to-primary text-white border-none shadow-lg animate-pulse">
                        <Sparkles className="h-3 w-3 mr-1" />
                        جديد
                      </Badge>
                    </div>

                    {/* Release Time */}
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="bg-black/70 text-white border-none text-xs backdrop-blur-sm">
                        {getDaysAgo(item.created_at)}
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="space-y-2 px-2">
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {item.title_ar || item.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{getTypeLabel(item.content_type)}</span>
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>{item.rating ? item.rating.toFixed(1) : 'غير متاح'}</span>
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-1">
                      {getCategoryLabels(item.categories).slice(0, 2).map((category, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs px-2 py-0 border-border text-muted-foreground"
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-4">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">لا توجد إضافات جديدة</h3>
              <p className="text-muted-foreground">
                لم يتم إضافة محتوى جديد من نوع {getTypeLabel(selectedType)} مؤخراً
              </p>
              <Button
                variant="outline"
                onClick={() => setSelectedType('all')}
              >
                عرض جميع الأنواع
              </Button>
            </div>
          </div>
        )}

        {/* View All Link */}
        {filteredReleases.length > 0 && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/new-releases')}
              className="group text-primary hover:text-primary/80"
            >
              عرض جميع الإضافات الجديدة
              <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
            </Button>
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

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};
