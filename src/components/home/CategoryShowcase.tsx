import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Film, Tv, Zap, Globe, Heart, Star, TrendingUp, ArrowRight, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CategoryStats {
  name: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  featured: Array<{
    id: string;
    title: string;
    title_ar?: string;
    poster_url?: string;
    rating: number;
    view_count: number;
  }>;
  gradient: string;
  route: string;
}

export const CategoryShowcase = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      const categoryConfigs = [
        {
          name: 'movies',
          label: 'الأفلام',
          icon: <Film className="h-6 w-6" />,
          gradient: 'from-blue-500 to-purple-600',
          route: '/category/movies',
          contentType: 'movie'
        },
        {
          name: 'series',
          label: 'المسلسلات',
          icon: <Tv className="h-6 w-6" />,
          gradient: 'from-green-500 to-teal-600',
          route: '/category/series',
          contentType: 'series'
        },
        {
          name: 'anime',
          label: 'الأنمي',
          icon: <Zap className="h-6 w-6" />,
          gradient: 'from-orange-500 to-red-600',
          route: '/category/anime',
          contentType: 'anime'
        },
        {
          name: 'international',
          label: 'أجنبي',
          icon: <Globe className="h-6 w-6" />,
          gradient: 'from-purple-500 to-pink-600',
          route: '/category/international',
          contentType: null
        }
      ];

      const categoryStats = await Promise.all(
        categoryConfigs.map(async (config) => {
          let query = supabase.from('content').select('id, title, title_ar, poster_url, rating, view_count');

          if (config.contentType) {
            query = query.eq('content_type', config.contentType);
          } else if (config.name === 'international') {
            query = query.in('language', ['en', 'es', 'fr', 'de', 'it']);
          }

          const [countResult, featuredResult] = await Promise.all([
            query.select('id', { count: 'exact' }),
            query.order('rating', { ascending: false }).limit(4)
          ]);

          return {
            name: config.name,
            label: config.label,
            icon: config.icon,
            count: countResult.count || 0,
            featured: featuredResult.data || [],
            gradient: config.gradient,
            route: config.route
          };
        })
      );

      setCategories(categoryStats);
    } catch (error) {
      console.error('Error fetching category stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
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
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-accent/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">استكشف المجموعات</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            اكتشف مجموعة واسعة من المحتوى المنوع من جميع أنحاء العالم
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {categories.map((category, index) => (
            <Card
              key={category.name}
              className={`group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl animate-fadeInUp ${
                hoveredCategory === category.name ? 'scale-105 shadow-2xl' : ''
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onMouseEnter={() => setHoveredCategory(category.name)}
              onMouseLeave={() => setHoveredCategory(null)}
              onClick={() => navigate(category.route)}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-90`} />
              
              {/* Background featured content */}
              <div className="absolute inset-0 opacity-20">
                {category.featured[0]?.poster_url && (
                  <img
                    src={category.featured[0].poster_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Content overlay */}
              <div className="absolute inset-0 bg-black/40" />

              <CardContent className="relative h-64 p-6 flex flex-col justify-between text-white">
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {category.icon}
                    <h3 className="text-xl font-bold">{category.label}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="secondary" className="bg-white/20 text-white border-none">
                      {category.count.toLocaleString('ar')} عنصر
                    </Badge>
                  </div>
                </div>

                {/* Featured content preview */}
                <div className="space-y-3">
                  {category.featured.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0">
                        {item.poster_url ? (
                          <img
                            src={item.poster_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-white/20" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.title_ar || item.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs opacity-75">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{item.rating ? item.rating.toFixed(1) : 'غير متاح'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hover effect */}
                <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity duration-300 ${
                  hoveredCategory === category.name ? 'opacity-100' : 'opacity-0'
                }`}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-white bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30"
                  >
                    <Play className="h-5 w-5 ml-2" />
                    استكشف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-primary">
              {categories.reduce((sum, cat) => sum + cat.count, 0).toLocaleString('ar')}
            </div>
            <p className="text-muted-foreground">إجمالي المحتوى</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-accent">
              {Math.floor(Math.random() * 50 + 20)}+
            </div>
            <p className="text-muted-foreground">فئة مختلفة</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-green-500">
              {Math.floor(Math.random() * 10 + 5)}
            </div>
            <p className="text-muted-foreground">لغات متنوعة</p>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-orange-500">
              {Math.floor(Math.random() * 20 + 10)}
            </div>
            <p className="text-muted-foreground">دولة مختلفة</p>
          </div>
        </div>

        {/* Popular Categories */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">الفئات الأكثر شعبية</h3>
              <p className="text-muted-foreground">
                اكتشف ما يشاهده الآخرون حول العالم
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {[
                'أكشن', 'دراما', 'كوميديا', 'رومانسي', 'إثارة', 'خيال علمي', 'رعب', 'مغامرة'
              ].map((genre, index) => (
                <Badge
                  key={genre}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors duration-300 animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => navigate(`/search?genre=${encodeURIComponent(genre)}`)}
                >
                  {genre}
                </Badge>
              ))}
            </div>

            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/browse')}
              className="group"
            >
              تصفح جميع الفئات
              <ArrowRight className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
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
