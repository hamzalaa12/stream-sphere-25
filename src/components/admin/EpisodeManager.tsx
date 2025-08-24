import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Play, Calendar, Clock, Link as LinkIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoUploader } from '@/components/upload/VideoUploader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Episode {
  id: string;
  season_id: string;
  episode_number: number;
  title: string | null;
  description: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  release_date: string | null;
  view_count: number | null;
  created_at: string;
  season: {
    season_number: number;
    content: {
      title: string;
      content_type: string;
    };
  };
  streaming_links: Array<{
    id: string;
    server_name: string;
    streaming_url: string;
    download_url: string | null;
    quality: string;
    is_active: boolean;
  }>;
}

interface Season {
  id: string;
  content_id: string;
  season_number: number;
  title: string | null;
  episode_count: number | null;
  content: {
    title: string;
    content_type: string;
  };
}

interface StreamingLink {
  server_name: string;
  streaming_url: string;
  download_url: string;
  quality: string;
}

export default function EpisodeManager() {
  const { toast } = useToast();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [filteredEpisodes, setFilteredEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  
  const [formData, setFormData] = useState({
    // البيانات الأساسية
    season_id: '',
    episode_number: 1,
    title: '',
    duration: 0,
    thumbnail_url: '',
    description: '',
    release_date: '',
  });

  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>([
    { server_name: '', streaming_url: '', download_url: '', quality: '720p' }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterEpisodes();
  }, [episodes, searchTerm, selectedSeason]);

  const fetchData = async () => {
    try {
      // جلب المواسم المتاحة
      const { data: seasonsData, error: seasonsError } = await supabase
        .from('seasons')
        .select(`
          *,
          content(title, content_type)
        `)
        .order('season_number');

      if (seasonsError) throw seasonsError;
      setSeasons(seasonsData || []);

      // جلب الحلقات مع الروابط
      const { data: episodesData, error: episodesError } = await supabase
        .from('episodes')
        .select(`
          *,
          season:seasons(
            season_number,
            content:content(title, content_type)
          ),
          streaming_links(*)
        `)
        .order('created_at', { ascending: false });

      if (episodesError) throw episodesError;
      setEpisodes(episodesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEpisodes = () => {
    let filtered = episodes;

    if (searchTerm) {
      filtered = filtered.filter(episode =>
        episode.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        episode.season.content.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedSeason !== 'all') {
      filtered = filtered.filter(episode => episode.season_id === selectedSeason);
    }

    setFilteredEpisodes(filtered);
  };

  const resetForm = () => {
    setFormData({
      season_id: '',
      episode_number: 1,
      title: '',
      duration: 0,
      thumbnail_url: '',
      description: '',
      release_date: '',
    });
    setStreamingLinks([
      { server_name: '', streaming_url: '', download_url: '', quality: '720p' }
    ]);
    setEditingEpisode(null);
  };

  const addStreamingLink = () => {
    setStreamingLinks([...streamingLinks, { server_name: '', streaming_url: '', download_url: '', quality: '720p' }]);
  };

  const removeStreamingLink = (index: number) => {
    setStreamingLinks(streamingLinks.filter((_, i) => i !== index));
  };

  const updateStreamingLink = (index: number, field: keyof StreamingLink, value: string) => {
    const updatedLinks = streamingLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    setStreamingLinks(updatedLinks);
  };

  const handleSubmit = async () => {
    if (!formData.season_id) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار الموسم',
        variant: 'destructive'
      });
      return;
    }

    if (formData.episode_number < 1) {
      toast({
        title: 'خطأ',
        description: 'رقم الحلقة يجب أن يكون أكبر من 0',
        variant: 'destructive'
      });
      return;
    }

    try {
      const episodeData = {
        season_id: formData.season_id,
        episode_number: formData.episode_number,
        title: formData.title || null,
        description: formData.description || null,
        duration: formData.duration || null,
        thumbnail_url: formData.thumbnail_url || null,
        release_date: formData.release_date || null,
      };

      let episodeId: string;

      if (editingEpisode) {
        const { error } = await supabase
          .from('episodes')
          .update(episodeData)
          .eq('id', editingEpisode.id);

        if (error) throw error;
        episodeId = editingEpisode.id;

        // حذف الروابط القديمة
        await supabase
          .from('streaming_links')
          .delete()
          .eq('episode_id', episodeId);

        toast({ title: 'تم', description: 'تم تحديث الحلقة بنجاح' });
      } else {
        // التحقق من عدم وجود حلقة بنفس الرقم في نفس الموسم
        const { data: existingEpisode } = await supabase
          .from('episodes')
          .select('id')
          .eq('season_id', formData.season_id)
          .eq('episode_number', formData.episode_number)
          .single();

        if (existingEpisode) {
          toast({
            title: 'خطأ',
            description: 'يوجد حلقة بنفس الرقم في هذا الموسم',
            variant: 'destructive'
          });
          return;
        }

        const { data, error } = await supabase
          .from('episodes')
          .insert([episodeData])
          .select('id')
          .single();

        if (error) throw error;
        episodeId = data.id;
        toast({ title: 'تم', description: 'تم إضافة الحلقة بنجاح' });
      }

      // إضافة روابط المشاهدة والتحميل
      const validLinks = streamingLinks.filter(link => 
        link.server_name.trim() && link.streaming_url.trim()
      );

      if (validLinks.length > 0) {
        const linksData = validLinks.map(link => ({
          episode_id: episodeId,
          server_name: link.server_name.trim(),
          streaming_url: link.streaming_url.trim(),
          download_url: link.download_url.trim() || null,
          quality: link.quality,
          is_active: true
        }));

        const { error: linksError } = await supabase
          .from('streaming_links')
          .insert(linksData);

        if (linksError) {
          console.error('Error adding streaming links:', linksError);
          toast({
            title: 'تحذير',
            description: 'تم إضافة الحلقة ولكن فشل في إضافة بعض الروابط',
            variant: 'default'
          });
        }
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving episode:', error);
      toast({
        title: 'خطأ',
        description: `فشل في حفظ الحلقة: ${error?.message || ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setFormData({
      season_id: episode.season_id,
      episode_number: episode.episode_number,
      title: episode.title || '',
      duration: episode.duration || 0,
      thumbnail_url: episode.thumbnail_url || '',
      description: episode.description || '',
      release_date: episode.release_date || '',
    });

    // تحميل الروابط الموجودة
    const existingLinks = episode.streaming_links.map(link => ({
      server_name: link.server_name,
      streaming_url: link.streaming_url,
      download_url: link.download_url || '',
      quality: link.quality
    }));
    
    setStreamingLinks(existingLinks.length > 0 ? existingLinks : [
      { server_name: '', streaming_url: '', download_url: '', quality: '720p' }
    ]);
    
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الحلقة؟ سيتم حذف جميع الروابط المرتبطة بها.')) return;

    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'تم', description: 'تم حذف الحلقة بنجاح' });
      fetchData();
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الحلقة',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'غير محدد';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الحلقات...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة الحلقات</h2>
          <p className="text-muted-foreground">إضافة وتعديل حلقات المسلسلات والأنمي</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة حلقة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingEpisode ? 'تعديل الحلقة' : 'إضافة حلقة جديدة'}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="bg-background-secondary">
                <TabsTrigger value="basic" className="gap-2">
                  <Play className="h-4 w-4" />
                  البيانات الأساسية
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  رفع الفيديو
                </TabsTrigger>
                <TabsTrigger value="streaming" className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  روابط المشاهدة
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">معلومات الحلقة</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="season_id">الموسم *</Label>
                      <Select
                        value={formData.season_id}
                        onValueChange={(value) => setFormData({...formData, season_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموسم" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((season) => (
                            <SelectItem key={season.id} value={season.id}>
                              {season.content.title} - الموسم {season.season_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="episode_number">رقم الحلقة *</Label>
                      <Input
                        id="episode_number"
                        type="number"
                        min="1"
                        value={formData.episode_number}
                        onChange={(e) => setFormData({...formData, episode_number: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">��سم الحلقة (اختياري)</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="اكتب اسم الحلقة"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">مدة الحلقة (بالدقائق)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="0"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="thumbnail_url">صورة مصغرة</Label>
                    <Input
                      id="thumbnail_url"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">وصف مختصر (اختياري)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="اكتب وصف مختصر للحلقة"
                      rows={3}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="streaming" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">روابط المشاهدة والتحميل</h3>
                    </div>
                    <Button onClick={addStreamingLink} size="sm" variant="outline">
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة رابط
                    </Button>
                  </div>

                  {streamingLinks.map((link, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">السيرفر {index + 1}</h4>
                          {streamingLinks.length > 1 && (
                            <Button 
                              onClick={() => removeStreamingLink(index)}
                              size="sm" 
                              variant="destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>اسم السيرفر</Label>
                            <Select
                              value={link.server_name}
                              onValueChange={(value) => updateStreamingLink(index, 'server_name', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر السيرفر" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Streamtape">Streamtape</SelectItem>
                                <SelectItem value="Vidcloud">Vidcloud</SelectItem>
                                <SelectItem value="Fembed">Fembed</SelectItem>
                                <SelectItem value="Upstream">Upstream</SelectItem>
                                <SelectItem value="Vidoza">Vidoza</SelectItem>
                                <SelectItem value="MyViid">MyViid</SelectItem>
                                <SelectItem value="Uqload">Uqload</SelectItem>
                                <SelectItem value="Other">أخرى</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>جودة الفيديو</Label>
                            <Select
                              value={link.quality}
                              onValueChange={(value) => updateStreamingLink(index, 'quality', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="360p">360p</SelectItem>
                                <SelectItem value="480p">480p</SelectItem>
                                <SelectItem value="720p">720p HD</SelectItem>
                                <SelectItem value="1080p">1080p FHD</SelectItem>
                                <SelectItem value="1440p">1440p QHD</SelectItem>
                                <SelectItem value="2160p">2160p 4K</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>رابط المشاهدة *</Label>
                          <Input
                            value={link.streaming_url}
                            onChange={(e) => updateStreamingLink(index, 'streaming_url', e.target.value)}
                            placeholder="https://example.com/watch"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>رابط التحميل (اختياري)</Label>
                          <Input
                            value={link.download_url}
                            onChange={(e) => updateStreamingLink(index, 'download_url', e.target.value)}
                            placeholder="https://example.com/download"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleSubmit}>
                {editingEpisode ? 'تحديث' : 'إضافة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الحلقات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSeason} onValueChange={setSelectedSeason}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المواسم</SelectItem>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.content.title} - الموسم {season.season_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Episodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEpisodes.map((episode) => (
          <Card key={episode.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video relative">
              {episode.thumbnail_url ? (
                <img
                  src={episode.thumbnail_url}
                  alt={episode.title || `الحلقة ${episode.episode_number}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-1">
                <Badge variant="secondary">
                  الحلقة {episode.episode_number}
                </Badge>
                <Badge variant="outline">
                  الموسم {episode.season.season_number}
                </Badge>
              </div>
              {episode.duration && (
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/70 text-white">
                    <Clock className="h-3 w-3 ml-1" />
                    {formatDuration(episode.duration)}
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <div className="mb-2">
                <p className="text-sm text-muted-foreground">{episode.season.content.title}</p>
                <h3 className="font-semibold line-clamp-1">
                  {episode.title || `الحلقة ${episode.episode_number}`}
                </h3>
              </div>
              
              {episode.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {episode.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>{episode.view_count || 0} مشاهدة</span>
                <span>{episode.streaming_links?.length || 0} رابط</span>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(episode)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 ml-1" />
                  تعديل
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(episode.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEpisodes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد حلقات مطابقة للبحث</p>
            {seasons.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                يجب إضافة مسلسل أو أنمي أولاً لإنشاء الحلقات
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
