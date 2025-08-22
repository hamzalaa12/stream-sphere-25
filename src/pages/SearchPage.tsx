import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  rating: number;
  release_date?: string;
  duration?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  language: string;
  country?: string;
  view_count: number;
  is_netflix: boolean;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [contentType, setContentType] = useState(searchParams.get('type') || 'all');
  const [language, setLanguage] = useState(searchParams.get('language') || 'all');
  const [genre, setGenre] = useState(searchParams.get('genre') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'latest');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const availableGenres = [
    'أكشن', 'درما', 'كوميديا', 'رعب', 'خيال علمي', 'مغامرة',
    'رومانسي', 'جريمة', 'وثائقي', 'حرب', 'تاريخي', 'موسيقي'
  ];

  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (contentType !== 'all') params.set('type', contentType);
    if (language !== 'all') params.set('language', language);
    if (genre !== 'all') params.set('genre', genre);
    if (sortBy !== 'latest') params.set('sort', sortBy);
    
    setSearchParams(params);
  }, [searchTerm, contentType, language, genre, sortBy, setSearchParams]);

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch();
    } else {
      setContent([]);
    }
  }, [searchTerm, contentType, language, genre, sortBy]);

  const performSearch = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('content')
        .select('*');

      // Apply search term
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm}%,title_en.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (contentType !== 'all') {
        query = query.eq('content_type', contentType as any);
      }

      if (language !== 'all') {
        query = query.eq('language', language);
      }

      if (genre !== 'all') {
        query = query.contains('categories', [genre]);
      }

      // Apply sorting
      switch (sortBy) {
        case 'rating':
          query = query.order('rating', { ascending: false });
          break;
        case 'views':
          query = query.order('view_count', { ascending: false });
          break;
        case 'title':
          query = query.order('title', { ascending: true });
          break;
        case 'release':
          query = query.order('release_date', { ascending: false });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'خطأ في البحث',
        description: 'حدث خطأ أثناء البحث، حاول مرة أخرى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      performSearch();
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

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'ar': return 'العربية';
      case 'en': return 'الإنجليزية';
      case 'ko': return 'الكورية';
      case 'ja': return 'اليابانية';
      case 'tr': return 'التركية';
      default: return 'جميع اللغات';
    }
  };

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'rating': return 'الأعلى تقييماً';
      case 'views': return 'الأكثر مشاهدة';
      case 'title': return 'الاسم (أ-ي)';
      case 'release': return 'تاريخ الإصدار';
      default: return 'الأحدث';
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">البحث في المحتوى</h1>
          <p className="text-muted-foreground">
            ابحث عن الأفلام والمسلسلات والأنمي المفضل لديك
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="ابحث عن فيلم أو مسلسل أو أنمي..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? 'جاري البحث...' : 'بحث'}
                </Button>
              </div>

              {/* Advanced Filters */}
              <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    تصفية متقدمة
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">نوع المحتوى</label>
                      <Select value={contentType} onValueChange={setContentType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأنواع</SelectItem>
                          <SelectItem value="movie">أفلام</SelectItem>
                          <SelectItem value="series">مسلسلات</SelectItem>
                          <SelectItem value="anime">أنمي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">اللغة</label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع اللغات</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">الإنجليزية</SelectItem>
                          <SelectItem value="ko">الكورية</SelectItem>
                          <SelectItem value="ja">اليابانية</SelectItem>
                          <SelectItem value="tr">التركية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">النوع</label>
                      <Select value={genre} onValueChange={setGenre}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">جميع الأنواع</SelectItem>
                          {availableGenres.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">ترتيب بـ</label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latest">الأحدث</SelectItem>
                          <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                          <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                          <SelectItem value="title">الاسم (أ-ي)</SelectItem>
                          <SelectItem value="release">تاريخ الإصدار</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active Filters */}
                  <div className="flex flex-wrap gap-2">
                    {contentType !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {getTypeLabel(contentType)}
                        <button onClick={() => setContentType('all')} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    )}
                    {language !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {getLanguageLabel(language)}
                        <button onClick={() => setLanguage('all')} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    )}
                    {genre !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        {genre}
                        <button onClick={() => setGenre('all')} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    )}
                    {sortBy !== 'latest' && (
                      <Badge variant="secondary" className="gap-1">
                        مرتب بـ: {getSortLabel(sortBy)}
                        <button onClick={() => setSortBy('latest')} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري البحث...</p>
          </div>
        ) : content.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-muted-foreground">
                تم العثور على {content.length} نتيجة
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
              {content.map((item) => (
                <ContentCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  posterUrl={item.poster_url}
                  rating={item.rating}
                  year={item.release_date ? new Date(item.release_date).getFullYear() : undefined}
                  type={item.content_type as 'movie' | 'series' | 'anime'}
                  categories={item.categories}
                  viewCount={item.view_count}
                  onClick={() => window.location.href = `/content/${item.id}`}
                />
              ))}
            </div>
          </>
        ) : searchTerm.trim() ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground mb-4">
                لم نجد أي محتوى يطابق البحث "{searchTerm}"
              </p>
              <Button onClick={() => setSearchTerm('')} variant="outline">
                مسح البحث
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">ابحث عن المحتوى</h3>
              <p className="text-muted-foreground">
                اكتب في مربع البحث أعلاه للعثور على الأفلام والمسلسلات المفضلة لديك
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}