import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { EnhancedContentCard } from '@/components/content/EnhancedContentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  Star,
  Calendar,
  TrendingUp,
  Eye,
  Film,
  Tv,
  Zap,
  Globe,
  X,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Content {
  id: string;
  title: string;
  title_ar?: string;
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
  duration?: number;
  created_at: string;
}

interface FilterState {
  search: string;
  type: string;
  genre: string;
  year: string;
  rating: number[];
  language: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  netflix: boolean;
  layout: 'grid' | 'list';
}

export default function EnhancedCategoryPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  const itemsPerPage = 24;

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    type: searchParams.get('type') || 'all',
    genre: searchParams.get('genre') || 'all',
    year: searchParams.get('year') || 'all',
    rating: [0, 10],
    language: searchParams.get('language') || 'all',
    sortBy: searchParams.get('sort') || 'created_at',
    sortOrder: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    netflix: searchParams.get('netflix') === 'true',
    layout: (searchParams.get('layout') as 'grid' | 'list') || 'grid'
  });

  const availableGenres = [
    'أكشن', 'دراما', 'كوميديا', 'رومانسي', 'إثارة', 'رعب', 
    'خيال علمي', 'فانتازيا', 'وثائقي', 'رسوم متحركة', 'مغامرة', 'جريمة'
  ];

  const availableLanguages = [
    { value: 'ar', label: 'العربية' },
    { value: 'en', label: 'الإنجليزية' },
    { value: 'ko', label: 'الكورية' },
    { value: 'ja', label: 'اليابانية' },
    { value: 'tr', label: 'التركية' },
    { value: 'es', label: 'الإسبانية' },
    { value: 'fr', label: 'الفرنسية' }
  ];

  const sortOptions = [
    { value: 'created_at', label: 'الأحدث' },
    { value: 'rating', label: 'التقييم' },
    { value: 'view_count', label: 'الأكثر مشاهدة' },
    { value: 'title', label: 'الاسم' },
    { value: 'release_date', label: 'سنة الإصدار' }
  ];

  useEffect(() => {
    fetchContent();
  }, [category, filters, currentPage]);

  useEffect(() => {
    updateURL();
  }, [filters]);

  const updateURL = () => {
    const params = new URLSearchParams();
    
    if (filters.search) params.set('search', filters.search);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.genre !== 'all') params.set('genre', filters.genre);
    if (filters.year !== 'all') params.set('year', filters.year);
    if (filters.language !== 'all') params.set('language', filters.language);
    if (filters.sortBy !== 'created_at') params.set('sort', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('order', filters.sortOrder);
    if (filters.netflix) params.set('netflix', 'true');
    if (filters.layout !== 'grid') params.set('layout', filters.layout);

    setSearchParams(params);
  };

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      let query = supabase.from('content').select('*', { count: 'exact' });
      
      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,title_ar.ilike.%${filters.search}%`);
      }

      if (filters.type !== 'all') {
        query = query.eq('content_type', filters.type);
      }

      if (filters.genre !== 'all') {
        const genreMap: Record<string, string> = {
          'أكشن': 'action',
          'دراما': 'drama',
          'كوميديا': 'comedy',
          'رومانسي': 'romance',
          'إثارة': 'thriller',
          'رعب': 'horror',
          'خيال علمي': 'sci-fi',
          'فانتازيا': 'fantasy',
          'وثائقي': 'documentary',
          'رسوم متحركة': 'animation',
          'مغامرة': 'adventure',
          'جريمة': 'crime'
        };
        const englishGenre = genreMap[filters.genre] || filters.genre.toLowerCase();
        query = query.contains('categories', [englishGenre]);
      }

      if (filters.year !== 'all') {
        const year = parseInt(filters.year);
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('release_date', startDate).lte('release_date', endDate);
      }

      if (filters.rating[0] > 0 || filters.rating[1] < 10) {
        query = query.gte('rating', filters.rating[0]).lte('rating', filters.rating[1]);
      }

      if (filters.language !== 'all') {
        query = query.eq('language', filters.language);
      }

      if (filters.netflix) {
        query = query.eq('is_netflix', true);
      }

      // Apply category-specific filters
      if (category) {
        switch (category) {
          case 'movies':
            query = query.eq('content_type', 'movie');
            break;
          case 'series':
            query = query.eq('content_type', 'series');
            break;
          case 'anime':
            query = query.eq('content_type', 'anime');
            break;
          case 'foreign':
            query = query.in('language', ['en', 'es', 'fr', 'de', 'it']);
            break;
          case 'asian':
            query = query.in('country', ['KR', 'JP', 'CN', 'TH', 'IN']);
            break;
          case 'netflix':
            query = query.eq('is_netflix', true);
            break;
          case 'trending':
            query = query.gte('rating', 7.5).order('view_count', { ascending: false });
            break;
        }
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setContent(data || []);
      setTotalCount(count || 0);
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

  const resetFilters = () => {
    setFilters({
      search: '',
      type: 'all',
      genre: 'all',
      year: 'all',
      rating: [0, 10],
      language: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc',
      netflix: false,
      layout: 'grid'
    });
    setCurrentPage(1);
  };

  const getPageTitle = () => {
    switch (category) {
      case 'movies': return 'الأفلام';
      case 'series': return 'المسلسلات';
      case 'anime': return 'الأنمي';
      case 'foreign': return 'المحتوى الأجنبي';
      case 'asian': return 'المحتوى الآسيوي';
      case 'netflix': return 'نتفليكس';
      case 'trending': return 'الرائج الآن';
      default: return 'المحتوى';
    }
  };

  const getPageIcon = () => {
    switch (category) {
      case 'movies': return <Film className="h-6 w-6" />;
      case 'series': return <Tv className="h-6 w-6" />;
      case 'anime': return <Zap className="h-6 w-6" />;
      case 'foreign':
      case 'asian': return <Globe className="h-6 w-6" />;
      case 'trending': return <TrendingUp className="h-6 w-6" />;
      default: return <Film className="h-6 w-6" />;
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

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading && content.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="container mx-auto py-8">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted rounded"></div>
                <div className="h-10 w-32 bg-muted rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-primary">
              {getPageIcon()}
              <h1 className="text-3xl lg:text-4xl font-bold">{getPageTitle()}</h1>
            </div>
            <Badge variant="outline" className="text-sm">
              {totalCount.toLocaleString('ar')} عنصر
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {/* Layout Toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={filters.layout === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilters({...filters, layout: 'grid'})}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={filters.layout === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilters({...filters, layout: 'list'})}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              الفلاتر
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {/* Quick Sort */}
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => setFilters({...filters, sortBy: value})}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  الفلاتر المتقدمة
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  إعادة تعيين
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">البحث</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن فيلم أو مسلسل..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">النوع</label>
                  <Select 
                    value={filters.type} 
                    onValueChange={(value) => setFilters({...filters, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="movie">أفلام</SelectItem>
                      <SelectItem value="series">مسل��لات</SelectItem>
                      <SelectItem value="anime">أنمي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Genre & Year */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">الفئة</label>
                  <Select 
                    value={filters.genre} 
                    onValueChange={(value) => setFilters({...filters, genre: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      {availableGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">السنة</label>
                  <Select 
                    value={filters.year} 
                    onValueChange={(value) => setFilters({...filters, year: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع السنوات</SelectItem>
                      {Array.from({ length: 20 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Rating & Language */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    التقييم ({filters.rating[0]} - {filters.rating[1]})
                  </label>
                  <Slider
                    value={filters.rating}
                    onValueChange={(value) => setFilters({...filters, rating: value})}
                    max={10}
                    min={0}
                    step={0.5}
                    className="py-4"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">اللغة</label>
                  <Select 
                    value={filters.language} 
                    onValueChange={(value) => setFilters({...filters, language: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع اللغات</SelectItem>
                      {availableLanguages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.netflix}
                    onChange={(e) => setFilters({...filters, netflix: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">نتفليكس فقط</span>
                  <Badge className="bg-red-600 text-white">Netflix</Badge>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Grid/List */}
        {content.length > 0 ? (
          <>
            <div className={
              filters.layout === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6"
                : "space-y-4"
            }>
              {content.map((item) => (
                <EnhancedContentCard
                  key={item.id}
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
                  duration={item.duration}
                  description={item.description}
                  variant={filters.layout === 'list' ? 'large' : 'default'}
                  onClick={() => navigate(`/content/${item.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span>...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto space-y-4">
              <Search className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold">لا توجد نتائج</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على محتوى يطابق معايير البحث المحددة
              </p>
              <Button onClick={resetFilters} variant="outline">
                إعادة تعيين الفلاتر
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
