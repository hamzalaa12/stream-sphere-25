import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Film, Tv, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

interface Content {
  id: string;
  title: string; // الاسم الإنجليزي الرئيسي
  title_ar?: string; // الاسم العربي
  title_en?: string; // للتوافق مع البيانات القديمة
  alternative_titles?: string[];
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  rating: number;
  release_date?: string;
  duration?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  language: string;
  country?: string;
  age_rating?: string;
  view_count: number;
  is_netflix: boolean;
  status: string;
  created_at: string;
  season_count?: number;
  total_episodes?: number;
}

interface EnhancedContentManagerProps {
  onStatsUpdate: () => void;
}

export default function EnhancedContentManager({ onStatsUpdate }: EnhancedContentManagerProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<Content[]>([]);
  const [filteredContent, setFilteredContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  const [formData, setFormData] = useState({
    // البيانات الأساسية
    title: '', // الاسم الرئيسي بالإنجليزية
    title_ar: '', // الاسم بالعربية
    alternative_titles: '', // أسماء أخرى مفصولة بفاصلة
    content_type: 'movie' as 'movie' | 'series' | 'anime',
    categories: '',
    release_date: '',
    season_count: 0,
    total_episodes: 0,
    rating: 0,
    description: '',
    poster_url: '',
    backdrop_url: '',

    // البيانات الإضافية
    age_rating: '',
    language: 'ar',
    duration: 0,
    tags: '',

    // البيانات التقنية
    country: '',
    trailer_url: '',
    is_netflix: false
  });

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    filterContent();
  }, [content, searchTerm, filterType]);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          seasons(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // حساب عدد المواسم والحلقات للمسلسلات
      const contentWithStats = await Promise.all(
        (data || []).map(async (item) => {
          if (item.content_type === 'series' || item.content_type === 'anime') {
            // عدد المواسم
            const { count: seasonCount } = await supabase
              .from('seasons')
              .select('*', { count: 'exact' })
              .eq('content_id', item.id);

            // إجمالي الحلقات
            const { data: episodes } = await supabase
              .from('episodes')
              .select('id')
              .in('season_id', 
                (await supabase
                  .from('seasons')
                  .select('id')
                  .eq('content_id', item.id)).data?.map(s => s.id) || []
              );

            return {
              ...item,
              season_count: seasonCount || 0,
              total_episodes: episodes?.length || 0
            };
          }
          return item;
        })
      );

      setContent(contentWithStats);
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'خطأ',
        description: '��شل في تحميل المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContent = () => {
    let filtered = content;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.title_ar && item.title_ar.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.title_en && item.title_en.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.alternative_titles && item.alternative_titles.some(altTitle =>
          altTitle.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.content_type === filterType);
    }

    setFilteredContent(filtered);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      title_ar: '',
      alternative_titles: '',
      content_type: 'movie',
      categories: '',
      release_date: '',
      season_count: 0,
      total_episodes: 0,
      rating: 0,
      description: '',
      poster_url: '',
      backdrop_url: '',
      age_rating: '',
      language: 'ar',
      duration: 0,
      tags: '',
      country: '',
      trailer_url: '',
      is_netflix: false
    });
    setEditingContent(null);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'خطأ',
        description: 'عنوان العمل مطلوب',
        variant: 'destructive'
      });
      return;
    }

    try {
      // تطبيع التصنيفات
      const inputCategories = formData.categories
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0);

      const arabicToEnum: Record<string, string> = {
        'أكشن': 'action', 'اكشن': 'action',
        'دراما': 'drama', 'درامي': 'drama',
        'كوميديا': 'comedy', 'كوميدي': 'comedy',
        'رومانسي': 'romance', 'رومانسية': 'romance',
        'إثارة': 'thriller', 'اثارة': 'thriller', 'مثير': 'thriller',
        'رعب': 'horror',
        'خيال علمي': 'sci-fi', 'خيال-علمي': 'sci-fi',
        'خيال': 'fantasy', 'فانتازيا': 'fantasy',
        'وثائقي': 'documentary',
        'رسوم متحركة': 'animation', 'انيميشن': 'animation', 'أنيميشن': 'animation',
      };

      const allowed = new Set<string>(Constants.public.Enums.content_category as readonly string[]);
      const normalizedCategories = inputCategories.map((c) => arabicToEnum[c] || c.toLowerCase());
      const invalidCategories = normalizedCategories.filter((c) => !allowed.has(c));

      if (invalidCategories.length > 0) {
        toast({
          title: 'تصنيفات غير صالحة',
          description: `هذه التصنيفات غير مدعومة: ${invalidCategories.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // معالجة الأسماء البديلة
      const alternativeTitlesArray = formData.alternative_titles
        .split(',')
        .map(title => title.trim())
        .filter(title => title.length > 0);

      const contentData = {
        title: formData.title, // الاسم الإنجليزي كاسم رئيسي
        title_ar: formData.title_ar || null, // الاسم العربي
        alternative_titles: alternativeTitlesArray.length > 0 ? alternativeTitlesArray : null,
        description: formData.description || null,
        poster_url: formData.poster_url || null,
        backdrop_url: formData.backdrop_url || null,
        trailer_url: formData.trailer_url || null,
        rating: formData.rating || null,
        release_date: formData.release_date || null,
        duration: formData.duration || null,
        content_type: formData.content_type,
        categories: normalizedCategories as any,
        language: formData.language,
        country: formData.country || null,
        age_rating: formData.age_rating || null,
        is_netflix: formData.is_netflix
      };

      let contentId: string;

      if (editingContent) {
        const { error } = await supabase
          .from('content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        contentId = editingContent.id;
        toast({ title: 'تم', description: 'تم تحديث المحتوى بنجاح' });
      } else {
        const { data, error } = await supabase
          .from('content')
          .insert([contentData])
          .select('id')
          .single();

        if (error) throw error;
        contentId = data.id;
        toast({ title: 'تم', description: 'تم إضافة المحتوى بنجاح' });
      }

      // إذا كان مسلسل أو أنمي، إنشاء المواسم
      if ((formData.content_type === 'series' || formData.content_type === 'anime') && formData.season_count > 0 && !editingContent) {
        const seasons = Array.from({ length: formData.season_count }, (_, index) => ({
          content_id: contentId,
          season_number: index + 1,
          title: `الموسم ${index + 1}`,
          episode_count: Math.floor(formData.total_episodes / formData.season_count)
        }));

        const { error: seasonsError } = await supabase
          .from('seasons')
          .insert(seasons);

        if (seasonsError) {
          console.error('Error creating seasons:', seasonsError);
        }
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchContent();
      onStatsUpdate();
    } catch (error: any) {
      console.error('Error saving content:', error);
      toast({
        title: 'خطأ',
        description: `فشل في حفظ المحتوى: ${error?.message || ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (contentItem: Content) => {
    setEditingContent(contentItem);
    setFormData({
      title: contentItem.title, // الاسم الإنجليزي
      title_ar: contentItem.title_ar || contentItem.title_en || '', // الاسم العربي
      alternative_titles: contentItem.alternative_titles?.join(', ') || '',
      content_type: contentItem.content_type,
      categories: contentItem.categories?.join(', ') || '',
      release_date: contentItem.release_date || '',
      season_count: contentItem.season_count || 0,
      total_episodes: contentItem.total_episodes || 0,
      rating: contentItem.rating,
      description: contentItem.description || '',
      poster_url: contentItem.poster_url || '',
      backdrop_url: contentItem.backdrop_url || '',
      age_rating: contentItem.age_rating || '',
      language: contentItem.language,
      duration: contentItem.duration || 0,
      tags: '',
      country: contentItem.country || '',
      trailer_url: contentItem.trailer_url || '',
      is_netflix: contentItem.is_netflix
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟ سيتم حذف جميع المواسم والحلقات المرتبطة به.')) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'تم', description: 'تم حذف المحتوى بنجاح' });
      fetchContent();
      onStatsUpdate();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف المحتوى',
        variant: 'destructive'
      });
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

  const getCategoryLabels = (categories: string[]) => {
    const categoryMap: Record<string, string> = {
      'action': 'أ��شن',
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
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل المحتوى...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة المحتوى</h2>
          <p className="text-muted-foreground">إضافة وتعديل الأفلام والمسلسلات والأنمي</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة محتوى جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingContent ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* البيانات الأساسية */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">البيانات الأساسية</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">اسم العمل (الإنجليزي) *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter English title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="title_ar">الاسم بالعربية</Label>
                    <Input
                      id="title_ar"
                      value={formData.title_ar}
                      onChange={(e) => setFormData({...formData, title_ar: e.target.value})}
                      placeholder="اكتب الاسم بالعربية"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternative_titles">أسماء أخرى</Label>
                  <Input
                    id="alternative_titles"
                    value={formData.alternative_titles}
                    onChange={(e) => setFormData({...formData, alternative_titles: e.target.value})}
                    placeholder="أدخل الأسماء البديلة مفصولة بفاصلة (مثال: الاسم الآخر، اسم ثالث)"
                  />
                  <p className="text-xs text-muted-foreground">
                    يمكنك إضافة عدة أسماء بديلة مفصولة بفاصلة
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="content_type">النوع *</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(value: 'movie' | 'series' | 'anime') =>
                        setFormData({...formData, content_type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="movie">فيلم</SelectItem>
                        <SelectItem value="series">مسلسل</SelectItem>
                        <SelectItem value="anime">أنمي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categories">الفئة *</Label>
                    <Input
                      id="categories"
                      value={formData.categories}
                      onChange={(e) => setFormData({...formData, categories: e.target.value})}
                      placeholder="أجنبي، آسيوي، أنمي، نتفلكس"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="release_date">سنة الإصدار</Label>
                    <Input
                      id="release_date"
                      type="date"
                      value={formData.release_date}
                      onChange={(e) => setFormData({...formData, release_date: e.target.value})}
                    />
                  </div>
                </div>

                {/* حقول خاصة بالمسلسلات والأنمي */}
                {(formData.content_type === 'series' || formData.content_type === 'anime') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/20 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="season_count">عدد المواسم</Label>
                      <Input
                        id="season_count"
                        type="number"
                        min="0"
                        value={formData.season_count}
                        onChange={(e) => setFormData({...formData, season_count: parseInt(e.target.value) || 0})}
                        placeholder="عدد المواسم"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_episodes">عدد الحلقات الإجمالي</Label>
                      <Input
                        id="total_episodes"
                        type="number"
                        min="0"
                        value={formData.total_episodes}
                        onChange={(e) => setFormData({...formData, total_episodes: parseInt(e.target.value) || 0})}
                        placeholder="إجمالي عدد الحلقات"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">التقييم (من 10)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">المدة (بالد��ائق)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                      placeholder="مدة الفيلم أو الحلقة"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف أو القصة</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="اكتب وصف العمل أو ملخص القصة"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poster_url">صورة الغلاف</Label>
                    <Input
                      id="poster_url"
                      value={formData.poster_url}
                      onChange={(e) => setFormData({...formData, poster_url: e.target.value})}
                      placeholder="https://example.com/poster.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="backdrop_url">صورة خلفية (اختياري)</Label>
                    <Input
                      id="backdrop_url"
                      value={formData.backdrop_url}
                      onChange={(e) => setFormData({...formData, backdrop_url: e.target.value})}
                      placeholder="https://example.com/backdrop.jpg"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* البيانات الإضافية */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">البيانات الإضافية</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age_rating">التصنيف العمري</Label>
                    <Select
                      value={formData.age_rating}
                      onValueChange={(value) => setFormData({...formData, age_rating: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر التصنيف" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G">عام (G)</SelectItem>
                        <SelectItem value="PG">إرشاد أبوي (PG)</SelectItem>
                        <SelectItem value="PG-13">+13 (PG-13)</SelectItem>
                        <SelectItem value="R">+17 (R)</SelectItem>
                        <SelectItem value="NC-17">+18 (NC-17)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">اللغة</Label>
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData({...formData, language: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">الإنجليزية</SelectItem>
                        <SelectItem value="ko">الكورية</SelectItem>
                        <SelectItem value="ja">اليابانية</SelectItem>
                        <SelectItem value="tr">التركية</SelectItem>
                        <SelectItem value="es">الإسبانية</SelectItem>
                        <SelectItem value="fr">الفرنسية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">البلد</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      placeholder="الولايات المتحدة"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">العلامات أو الكلمات المفتاحية</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="أكشن، إثارة، بطولة..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trailer_url">رابط الإعلان (اختياري)</Label>
                  <Input
                    id="trailer_url"
                    value={formData.trailer_url}
                    onChange={(e) => setFormData({...formData, trailer_url: e.target.value})}
                    placeholder="https://youtube.com/watch?v="
                  />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="is_netflix"
                    checked={formData.is_netflix}
                    onCheckedChange={(checked) => setFormData({...formData, is_netflix: checked})}
                  />
                  <Label htmlFor="is_netflix">متوفر على نتفليكس</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button onClick={handleSubmit}>
                  {editingContent ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في المحتوى..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            <SelectItem value="movie">الأفلام</SelectItem>
            <SelectItem value="series">المسلسلات</SelectItem>
            <SelectItem value="anime">الأنمي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[2/3] relative">
              {item.poster_url ? (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">لا توجد صورة</span>
                </div>
              )}
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <Badge variant="secondary">{getTypeLabel(item.content_type)}</Badge>
                {item.is_netflix && <Badge className="bg-red-600">نتفليكس</Badge>}
                {item.age_rating && <Badge variant="outline">{item.age_rating}</Badge>}
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold mb-1 line-clamp-1">{item.title}</h3>
              {(item.title_ar || item.title_en) && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                  {item.title_ar || item.title_en}
                </p>
              )}

              {/* الأسماء البديلة */}
              {item.alternative_titles && item.alternative_titles.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">أسماء أخرى:</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.alternative_titles.slice(0, 2).join(', ')}
                    {item.alternative_titles.length > 2 && '...'}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>{item.rating}/10 ⭐</span>
                <span>{item.view_count} مشاهدة</span>
              </div>

              {/* معلومات المواسم والحلقات للمسلسلات */}
              {(item.content_type === 'series' || item.content_type === 'anime') && (
                <div className="text-sm text-muted-foreground mb-2">
                  {item.season_count ? `${item.season_count} مواسم` : '0 مواسم'} • {item.total_episodes ? `${item.total_episodes} حلقة` : '0 حلقات'}
                </div>
              )}

              {/* التصنيفات */}
              <div className="flex flex-wrap gap-1 mb-3">
                {getCategoryLabels(item.categories)?.slice(0, 2).map((category, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(item)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">لا يوجد محتوى مطابق للبحث</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
