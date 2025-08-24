import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Star, Clock, TrendingUp, Zap, Film, Tv, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface FeaturedContent {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  rating: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  view_count: number;
}

export const EnhancedHeroSection = () => {
  const navigate = useNavigate();
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    fetchFeaturedContent();
  }, []);

  // Auto-rotate featured content
  useEffect(() => {
    if (!isAutoPlaying || featuredContent.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredContent.length);
    }, 8000); // Change every 8 seconds

    return () => clearInterval(interval);
  }, [featuredContent.length, isAutoPlaying]);

  const fetchFeaturedContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .gte('rating', 8.0)
        .order('view_count', { ascending: false })
        .limit(5);

      if (error) throw error;
      setFeaturedContent(data || []);
    } catch (error) {
      console.error('Error fetching featured content:', error);
    }
  };

  const currentContent = featuredContent[currentIndex];

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="h-4 w-4" />;
      case 'series': return <Tv className="h-4 w-4" />;
      case 'anime': return <Zap className="h-4 w-4" />;
      default: return <Film className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'movie': return 'فيلم';
      case 'series': return 'مسلسل';
      case 'anime': return 'أنمي';
      default: return type;
    }
  };

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background with parallax effect */}
      <div className="absolute inset-0">
        {currentContent && (
          <>
            {/* Main background */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-110 transition-all duration-1000 ease-out"
              style={{
                backgroundImage: `url(${currentContent.backdrop_url || currentContent.poster_url})`,
              }}
            />
            
            {/* Overlay gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                  }}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Fallback gradient */}
        {!currentContent && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20" />
        )}
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Text Content */}
            <div className="space-y-8 text-white">
              {currentContent ? (
                <>
                  {/* Content Type & Stats */}
                  <div className="flex items-center gap-4 animate-fadeInUp">
                    <Badge variant="secondary" className="bg-primary/90 text-white border-none">
                      {getTypeIcon(currentContent.content_type)}
                      <span className="mr-2">{getTypeLabel(currentContent.content_type)}</span>
                    </Badge>
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="h-4 w-4 fill-current" />
                      <span className="font-bold">{currentContent.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-300">
                      <TrendingUp className="h-4 w-4" />
                      <span>{currentContent.view_count.toLocaleString('ar')} مشاهدة</span>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-4 animate-fadeInUp animation-delay-200">
                    <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                      <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                        {currentContent.title_ar || currentContent.title}
                      </span>
                    </h1>
                    
                    {currentContent.title_ar && currentContent.title_ar !== currentContent.title && (
                      <p className="text-xl lg:text-2xl text-gray-300 font-medium">
                        {currentContent.title}
                      </p>
                    )}
                  </div>

                  {/* Categories */}
                  <div className="flex flex-wrap gap-3 animate-fadeInUp animation-delay-400">
                    {getCategoryLabels(currentContent.categories).slice(0, 3).map((category, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-white/10 text-white border-white/30 backdrop-blur-sm"
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>

                  {/* Description */}
                  {currentContent.description && (
                    <p className="text-lg lg:text-xl text-gray-200 leading-relaxed max-w-2xl animate-fadeInUp animation-delay-600">
                      {currentContent.description.slice(0, 200)}
                      {currentContent.description.length > 200 && '...'}
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp animation-delay-800">
                    <Button
                      size="lg"
                      className="text-lg px-8 py-4 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
                      onClick={() => navigate(`/content/${currentContent.id}`)}
                    >
                      <Play className="h-6 w-6 ml-2" />
                      مشاهدة الآن
                    </Button>
                    
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                      onClick={() => navigate(`/content/${currentContent.id}`)}
                    >
                      <Plus className="h-6 w-6 ml-2" />
                      التفاصيل
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Default content when no featured content */}
                  <div className="space-y-8">
                    <div className="animate-fadeInUp">
                      <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
                        <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                          StreamSphere
                        </span>
                      </h1>
                      <p className="text-xl lg:text-2xl text-gray-200 max-w-2xl">
                        عالم من الترفيه لا محدود • آلاف الأفلام والمسلسلات والأنمي
                      </p>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-4 animate-fadeInUp animation-delay-400">
                      <Badge variant="secondary" className="bg-primary/20 text-white border-primary/30">
                        <Star className="h-4 w-4 ml-1" />
                        أحدث الإصدارات
                      </Badge>
                      <Badge variant="secondary" className="bg-accent/20 text-white border-accent/30">
                        <Play className="h-4 w-4 ml-1" />
                        جودة عالية
                      </Badge>
                      <Badge variant="secondary" className="bg-secondary/20 text-white border-secondary/30">
                        <Clock className="h-4 w-4 ml-1" />
                        متاح دائماً
                      </Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 animate-fadeInUp animation-delay-600">
                      <Button
                        size="lg"
                        className="text-lg px-8 py-4 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg transition-all duration-300 hover:scale-105"
                        onClick={() => navigate('/category/movies')}
                      >
                        <Play className="h-6 w-6 ml-2" />
                        استك��ف المحتوى
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Featured Content Carousel */}
            {featuredContent.length > 0 && (
              <div className="hidden lg:block animate-fadeInRight">
                <div className="relative">
                  {/* Main poster */}
                  <div className="relative group">
                    <img
                      src={currentContent?.poster_url}
                      alt={currentContent?.title}
                      className="w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-black/50 transition-transform duration-500 group-hover:scale-105"
                    />
                    
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Button
                        size="lg"
                        variant="ghost"
                        className="text-white bg-white/20 backdrop-blur-sm border border-white/30"
                        onClick={() => navigate(`/content/${currentContent?.id}`)}
                      >
                        <Play className="h-8 w-8" />
                      </Button>
                    </div>
                  </div>

                  {/* Carousel indicators */}
                  <div className="flex justify-center gap-2 mt-6">
                    {featuredContent.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentIndex(index);
                          setIsAutoPlaying(false);
                          setTimeout(() => setIsAutoPlaying(true), 5000);
                        }}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          index === currentIndex
                            ? 'bg-primary scale-125'
                            : 'bg-white/30 hover:bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center bg-white/5 backdrop-blur-sm">
          <div className="w-1 h-3 bg-white/70 rounded-full mt-2 animate-pulse" />
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-fadeInRight {
          animation: fadeInRight 0.8s ease-out forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animation-delay-600 {
          animation-delay: 0.6s;
        }

        .animation-delay-800 {
          animation-delay: 0.8s;
        }
      `}</style>
    </section>
  );
};
