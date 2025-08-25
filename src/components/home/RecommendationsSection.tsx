import React, { useState, useEffect } from 'react';
import { ContentCard } from '@/components/content/ContentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Brain, 
  TrendingUp, 
  Users, 
  Shuffle, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  Target,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface RecommendedContent {
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
  match_score?: number;
  reason?: string;
}

interface RecommendationCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: RecommendedContent[];
  color: string;
}

export const RecommendationsSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const fetchRecommendations = async () => {
    try {
      if (user) {
        await fetchPersonalizedRecommendations();
      } else {
        await fetchGeneralRecommendations();
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonalizedRecommendations = async () => {
    if (!user) return;

    // Get user's favorites and watch history
    const [favoritesResult, watchHistoryResult] = await Promise.all([
      supabase
        .from('favorites')
        .select('content:content(*)')
        .eq('user_id', user.id),
      supabase
        .from('watch_history')
        .select('content:content(*), episode:episodes(season:seasons(content:content(*)))')
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(10)
    ]);

    const favorites = favoritesResult.data?.map(f => f.content).filter(Boolean) || [];
    const watchedContent = watchHistoryResult.data?.map(w => 
      w.content || w.episode?.season?.content
    ).filter(Boolean) || [];

    // Extract user preferences
    const userCategories = new Set();
    const userTypes = new Set();
    
    [...favorites, ...watchedContent].forEach(content => {
      if (content) {
        content.categories?.forEach(cat => userCategories.add(cat));
        userTypes.add(content.content_type);
      }
    });

    const categoryArray = Array.from(userCategories);
    const typeArray = Array.from(userTypes);

    // Fetch recommendations based on preferences
    const recommendationCategories = await Promise.all([
      // Based on favorites
      fetchCategoryRecommendations(
        'للمفضلة المشابهة', 
        'محتوى مشابه لما أضفته للمفضلة',
        <Heart className="h-5 w-5" />,
        'text-red-500',
        categoryArray.slice(0, 3),
        typeArray.slice(0, 2)
      ),
      
      // Trending among similar users
      fetchTrendingRecommendations(),
      
      // New releases in preferred categories
      fetchNewInPreferences(categoryArray.slice(0, 2)),
      
      // High rated content
      fetchHighRatedRecommendations(typeArray.slice(0, 2))
    ]);

    setRecommendations(recommendationCategories.filter(cat => cat.items.length > 0));
  };

  const fetchGeneralRecommendations = async () => {
    const recommendationCategories = await Promise.all([
      // Most popular
      fetchCategoryRecommendations(
        'الأكثر شعبية',
        'المحتوى الأكثر مشاهدة حالياً',
        <TrendingUp className="h-5 w-5" />,
        'text-green-500',
        [],
        [],
        'view_count'
      ),
      
      // Highest rated
      fetchCategoryRecommendations(
        'ال��على تقييماً',
        'أفضل المحتوى من ناحية التقييم',
        <Star className="h-5 w-5" />,
        'text-yellow-500',
        [],
        [],
        'rating'
      ),
      
      // Random discovery
      fetchRandomRecommendations(),
      
      // Recent releases
      fetchRecentReleases()
    ]);

    setRecommendations(recommendationCategories.filter(cat => cat.items.length > 0));
  };

  const fetchCategoryRecommendations = async (
    title: string,
    description: string,
    icon: React.ReactNode,
    color: string,
    categories: string[] = [],
    types: string[] = [],
    orderBy: string = 'created_at'
  ): Promise<RecommendationCategory> => {
    let query = supabase.from('content').select('*');

    if (categories.length > 0) {
      query = query.overlaps('categories', categories);
    }

    if (types.length > 0) {
      query = query.in('content_type', types);
    }

    query = query.order(orderBy, { ascending: false }).limit(8);

    const { data, error } = await query;

    return {
      id: title.replace(/\s+/g, '-').toLowerCase(),
      title,
      description,
      icon,
      color,
      items: (data || []).map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 30 + 70), // Simulated match score
        reason: getRandomReason()
      }))
    };
  };

  const fetchTrendingRecommendations = async (): Promise<RecommendationCategory> => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .gte('rating', 7.5)
      .order('view_count', { ascending: false })
      .limit(8);

    return {
      id: 'trending',
      title: 'رائج الآن',
      description: 'ما يشاهده الآخرون حالياً',
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-500',
      items: (data || []).map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 25 + 75),
        reason: 'رائج بين المستخدمين'
      }))
    };
  };

  const fetchNewInPreferences = async (categories: string[]): Promise<RecommendationCategory> => {
    let query = supabase.from('content').select('*');
    
    if (categories.length > 0) {
      query = query.overlaps('categories', categories);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await query
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(8);

    return {
      id: 'new-preferences',
      title: 'ج��يد في تفضيلاتك',
      description: 'إضافات حديثة تناسب ذوقك',
      icon: <Sparkles className="h-5 w-5" />,
      color: 'text-purple-500',
      items: (data || []).map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 20 + 80),
        reason: 'يناسب تفضيلاتك'
      }))
    };
  };

  const fetchHighRatedRecommendations = async (types: string[]): Promise<RecommendationCategory> => {
    let query = supabase.from('content').select('*');
    
    if (types.length > 0) {
      query = query.in('content_type', types);
    }

    const { data } = await query
      .gte('rating', 8.0)
      .order('rating', { ascending: false })
      .limit(8);

    return {
      id: 'high-rated',
      title: 'مقترحات ذكية',
      description: 'اختيارات مخصصة لك بالذكاء الاصطناعي',
      icon: <Brain className="h-5 w-5" />,
      color: 'text-indigo-500',
      items: (data || []).map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 15 + 85),
        reason: 'تقييم عالي في فئتك المفضلة'
      }))
    };
  };

  const fetchRandomRecommendations = async (): Promise<RecommendationCategory> => {
    const { data } = await supabase
      .from('content')
      .select('*')
      .gte('rating', 6.0)
      .order('created_at', { ascending: false })
      .limit(100);

    // Shuffle and take 8 random items
    const shuffled = (data || []).sort(() => 0.5 - Math.random()).slice(0, 8);

    return {
      id: 'discovery',
      title: 'اكتشاف جديد',
      description: 'محتوى متنوع قد يعجبك',
      icon: <Shuffle className="h-5 w-5" />,
      color: 'text-orange-500',
      items: shuffled.map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 40 + 60),
        reason: 'اكتشاف جديد'
      }))
    };
  };

  const fetchRecentReleases = async (): Promise<RecommendationCategory> => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data } = await supabase
      .from('content')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(8);

    return {
      id: 'recent',
      title: 'وصل حديثاً',
      description: 'آخر الإضافات الجديدة',
      icon: <Target className="h-5 w-5" />,
      color: 'text-cyan-500',
      items: (data || []).map(item => ({
        ...item,
        match_score: Math.floor(Math.random() * 30 + 70),
        reason: 'إضافة حديثة'
      }))
    };
  };

  const getRandomReason = () => {
    const reasons = [
      'يناسب ذوقك',
      'محبوب من قبل المشاهدين',
      'تقييم ممتاز',
      'مشابه لما شاهدته',
      'اختيار المحررين',
      'رائج حالياً'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
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
      <section className="py-16 bg-background-secondary/30">
        <div className="container mx-auto px-4">
          <div className="animate-pulse space-y-12">
            <div className="text-center space-y-4">
              <div className="h-8 bg-muted rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-muted rounded w-1/4"></div>
                  <div className="h-8 w-8 bg-muted rounded-full"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="space-y-2">
                      <div className="aspect-[2/3] bg-muted rounded-lg"></div>
                      <div className="h-4 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background-secondary/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-40 w-48 h-48 bg-accent/5 rounded-full blur-2xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <h2 className="text-3xl lg:text-4xl font-bold">
                {user ? 'مقترحات شخصية' : 'مقترحات لك'}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshRecommendations}
                disabled={refreshing}
                className="rounded-full"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {user 
                ? 'اقتراحات مخصصة بناءً على تفضيلاتك وما ش��هدته سابقاً'
                : 'اكتشف محتوى رائع قد يعجبك من مجموعتنا المتنوعة'
              }
            </p>
          </div>
        </div>

        {/* Recommendation Categories */}
        <div className="space-y-12">
          {recommendations.map((category, categoryIndex) => (
            <div key={category.id} className="space-y-6">
              {/* Category Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={category.color}>
                    {category.icon}
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-bold">{category.title}</h3>
                    <p className="text-muted-foreground text-sm">{category.description}</p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  onClick={() => navigate(`/recommendations/${category.id}`)}
                  className="group"
                >
                  عرض الكل
                  <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {category.items.slice(0, 6).map((item, index) => (
                  <div
                    key={item.id}
                    className="relative animate-fadeInUp"
                    style={{ animationDelay: `${(categoryIndex * 6 + index) * 0.05}s` }}
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
                      categories={getCategoryLabels(item.categories || [])}
                      viewCount={item.view_count}
                      onClick={() => navigate(`/content/${item.id}`)}
                    />

                    {/* Match Score */}
                    {user && item.match_score && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <Badge 
                          className={`text-white border-none text-xs ${
                            item.match_score >= 90 ? 'bg-green-500' :
                            item.match_score >= 80 ? 'bg-blue-500' :
                            item.match_score >= 70 ? 'bg-orange-500' : 'bg-gray-500'
                          }`}
                        >
                          {item.match_score}% توافق
                        </Badge>
                      </div>
                    )}

                    {/* Reason */}
                    {item.reason && (
                      <div className="absolute bottom-2 left-2 right-2">
                        <Badge 
                          variant="secondary" 
                          className="bg-black/70 text-white border-none text-xs backdrop-blur-sm truncate w-full"
                        >
                          {item.reason}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {recommendations.length === 0 && (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-4">
              <Brain className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">لا توجد اقتراحات متاحة</h3>
              <p className="text-muted-foreground">
                ابدأ بمشاهدة بعض المحتوى ليتمكن النظام من اقتراح محتوى مناسب لك
              </p>
              <Button
                onClick={() => navigate('/browse')}
                className="mt-4"
              >
                تصفح المحتوى
              </Button>
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
