import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

interface Content {
  id: string;
  title: string;
  title_en?: string;
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
  view_count: number;
  is_netflix: boolean;
  status: string;
  created_at: string;
}

interface ContentManagerProps {
  onStatsUpdate: () => void;
}

export default function ContentManager({ onStatsUpdate }: ContentManagerProps) {
  const { toast } = useToast();
  const [content, setContent] = useState<Content[]>([]);
  const [filteredContent, setFilteredContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    title_en: '',
    description: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    rating: 0,
    release_date: '',
    duration: 0,
    content_type: 'movie' as 'movie' | 'series' | 'anime',
    categories: '',
    language: 'ar',
    country: '',
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
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

  const filterContent = () => {
    let filtered = content;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.title_en && item.title_en.toLowerCase().includes(searchTerm.toLowerCase()))
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
      title_en: '',
      description: '',
      poster_url: '',
      backdrop_url: '',
      trailer_url: '',
      rating: 0,
      release_date: '',
      duration: 0,
      content_type: 'movie',
      categories: '',
      language: 'ar',
      country: '',
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
      // Normalize and validate categories against enum
      const inputCategories = formData.categories
        .split(',')
        .map((cat) => cat.trim())
        .filter((cat) => cat.length > 0);

      const arabicToEnum: Record<string, string> = {
        'أكشن': 'action',
        'اكشن': 'action',
        'دراما': 'drama',
        'كوميديا': 'comedy',
        'رومانسي': 'romance',
        'رومانسية': 'romance',
        'إثارة': 'thriller',
        'اثارة': 'thriller',
        'رعب': 'horror',
        'خيال علمي': 'sci-fi',
        'خيال-علمي': 'sci-fi',
        'خيال': 'fantasy',
        'فانتازيا': 'fantasy',
        'وثائقي': 'documentary',
        'رسوم متحركة': 'animation',
        'انيميشن': 'animation',
        'أنيميشن': 'animation',
      };

      const allowed = new Set<string>(Constants.public.Enums.content_category as readonly string[]);
      const normalizedCategories = inputCategories.map((c) => arabicToEnum[c] || c.toLowerCase());
      const invalidCategories = normalizedCategories.filter((c) => !allowed.has(c));

      if (invalidCategories.length > 0) {
        toast({
          title: 'تصنيفات غير صالحة',
          description: `هذه التصنيفات غير مدعومة: ${invalidCategories.join(', ')}. التصنيفات المسموحة: ${Array.from(allowed).join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      const contentData = {
        ...formData,
        categories: normalizedCategories as any,
        duration: formData.duration || null,
        release_date: formData.release_date || null,
      };

      if (editingContent) {
        const { error } = await supabase
          .from('content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث المحتوى بنجاح' });
      } else {
        const { error } = await supabase
          .from('content')
          .insert([contentData]);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة المحتوى بنجاح' });
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchContent();
      onStatsUpdate();
    } catch (error: any) {
      console.error('Error saving content:', error);
      const msg = error?.message || 'فشل في حفظ المحتوى';
      const details = error?.details ? ` - ${error.details}` : '';
      toast({
        title: 'خطأ',
        description: `${msg}${details}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (contentItem: Content) => {
    setEditingContent(contentItem);
    setFormData({
      title: contentItem.title,
      title_en: contentItem.title_en || '',
      description: contentItem.description || '',
      poster_url: contentItem.poster_url || '',
      backdrop_url: contentItem.backdrop_url || '',
      trailer_url: contentItem.trailer_url || '',
      rating: contentItem.rating,
      release_date: contentItem.release_date || '',
      duration: contentItem.duration || 0,
      content_type: contentItem.content_type,
      categories: contentItem.categories?.join(', ') || '',
      language: contentItem.language,
      country: contentItem.country || '',
      is_netflix: contentItem.is_netflix
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المحتوى؟')) return;

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
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? 'تعديل المحتوى' : 'إضافة محتوى جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">العنوان بالعربية *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="اكتب العنوان"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title_en">العنوان بالإنجليزية</Label>
                  <Input
                    id="title_en"
                    value={formData.title_en}
                    onChange={(e) => setFormData({...formData, title_en: e.target.value})}
                    placeholder="English Title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="اكتب وصف العمل"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="content_type">نوع المحتوى</Label>
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="release_date">تاريخ الإصدار</Label>
                  <Input
                    id="release_date"
                    type="date"
                    value={formData.release_date}
                    onChange={(e) => setFormData({...formData, release_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">المدة (بالدقائق)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categories">التصنيفات (مفصولة بفاصلة)</Label>
                <Input
                  id="categories"
                  value={formData.categories}
                  onChange={(e) => setFormData({...formData, categories: e.target.value})}
                  placeholder="أكشن, درама, كوميديا"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">البلد</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                    placeholder="الولايات المتحدة"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="poster_url">رابط البوستر</Label>
                  <Input
                    id="poster_url"
                    value={formData.poster_url}
                    onChange={(e) => setFormData({...formData, poster_url: e.target.value})}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backdrop_url">رابط الخلفية</Label>
                <Input
                  id="backdrop_url"
                  value={formData.backdrop_url}
                  onChange={(e) => setFormData({...formData, backdrop_url: e.target.value})}
                  placeholder="https://example.com/backdrop.jpg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trailer_url">رابط الإعلان</Label>
                <Input
                  id="trailer_url"
                  value={formData.trailer_url}
                  onChange={(e) => setFormData({...formData, trailer_url: e.target.value})}
                  placeholder="https://youtube.com/watch?v="
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_netflix"
                  checked={formData.is_netflix}
                  onCheckedChange={(checked) => setFormData({...formData, is_netflix: checked})}
                />
                <Label htmlFor="is_netflix">متوفر على نتفليكس</Label>
              </div>

              <div className="flex justify-end gap-3">
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
          <Card key={item.id} className="overflow-hidden">
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
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant="secondary">{getTypeLabel(item.content_type)}</Badge>
                {item.is_netflix && <Badge className="bg-red-600">نتفليكس</Badge>}
              </div>
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold mb-1 line-clamp-1">{item.title}</h3>
              {item.title_en && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{item.title_en}</p>
              )}
              
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>{item.rating}/10</span>
                <span>{item.view_count} مشاهدة</span>
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