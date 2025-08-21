import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Link as LinkIcon, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamingLink {
  id: string;
  streaming_url: string;
  download_url?: string;
  server_name: string;
  quality: string;
  is_active: boolean;
  content_id?: string;
  episode_id?: string;
  created_at: string;
  content?: {
    title: string;
    content_type: string;
  };
  episode?: {
    episode_number: number;
    title?: string;
    season?: {
      season_number: number;
      content?: {
        title: string;
      };
    };
  };
}

interface Content {
  id: string;
  title: string;
  content_type: string;
}

interface Episode {
  id: string;
  episode_number: number;
  title?: string;
  season_id: string;
}

export default function StreamingLinksManager() {
  const { toast } = useToast();
  const [links, setLinks] = useState<StreamingLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<StreamingLink[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<StreamingLink | null>(null);

  const [formData, setFormData] = useState({
    streaming_url: '',
    download_url: '',
    server_name: '',
    quality: '720p',
    is_active: true,
    content_id: '',
    episode_id: '',
    link_type: 'content' as 'content' | 'episode'
  });

  useEffect(() => {
    fetchLinks();
    fetchContent();
  }, []);

  useEffect(() => {
    filterLinks();
  }, [links, searchTerm]);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('streaming_links')
        .select(`
          *,
          content:content (title, content_type),
          episode:episodes (
            episode_number,
            title,
            season:seasons (
              season_number,
              content:content (title)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinks(data || []);
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل روابط المشاهدة',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async () => {
    try {
      const { data: contentData } = await supabase
        .from('content')
        .select('id, title, content_type')
        .order('title');

      setContent(contentData || []);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };

  const fetchEpisodes = async (contentId: string) => {
    try {
      const { data: seasonsData } = await supabase
        .from('seasons')
        .select(`
          id,
          episodes (id, episode_number, title, season_id)
        `)
        .eq('content_id', contentId);

      const allEpisodes = seasonsData?.flatMap(season => 
        season.episodes?.map(ep => ({ ...ep, season_id: season.id })) || []
      ) || [];

      setEpisodes(allEpisodes);
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };

  const filterLinks = () => {
    let filtered = links;

    if (searchTerm) {
      filtered = filtered.filter(link =>
        link.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.content?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.episode?.season?.content?.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLinks(filtered);
  };

  const resetForm = () => {
    setFormData({
      streaming_url: '',
      download_url: '',
      server_name: '',
      quality: '720p',
      is_active: true,
      content_id: '',
      episode_id: '',
      link_type: 'content'
    });
    setEditingLink(null);
    setEpisodes([]);
  };

  const handleSubmit = async () => {
    if (!formData.streaming_url.trim() || !formData.server_name.trim()) {
      toast({
        title: 'خطأ',
        description: 'رابط المشاهدة واسم الخادم مطلوبان',
        variant: 'destructive'
      });
      return;
    }

    if (formData.link_type === 'content' && !formData.content_id) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار المحتوى',
        variant: 'destructive'
      });
      return;
    }

    if (formData.link_type === 'episode' && !formData.episode_id) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار الحلقة',
        variant: 'destructive'
      });
      return;
    }

    try {
      const linkData = {
        streaming_url: formData.streaming_url,
        download_url: formData.download_url || null,
        server_name: formData.server_name,
        quality: formData.quality,
        is_active: formData.is_active,
        content_id: formData.link_type === 'content' ? formData.content_id : null,
        episode_id: formData.link_type === 'episode' ? formData.episode_id : null
      };

      if (editingLink) {
        const { error } = await supabase
          .from('streaming_links')
          .update(linkData)
          .eq('id', editingLink.id);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث الرابط بنجاح' });
      } else {
        const { error } = await supabase
          .from('streaming_links')
          .insert([linkData]);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة الرابط بنجاح' });
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchLinks();
    } catch (error) {
      console.error('Error saving link:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الرابط',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (link: StreamingLink) => {
    setEditingLink(link);
    setFormData({
      streaming_url: link.streaming_url,
      download_url: link.download_url || '',
      server_name: link.server_name,
      quality: link.quality,
      is_active: link.is_active,
      content_id: link.content_id || '',
      episode_id: link.episode_id || '',
      link_type: link.episode_id ? 'episode' : 'content'
    });

    if (link.content_id) {
      fetchEpisodes(link.content_id);
    }

    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الرابط؟')) return;

    try {
      const { error } = await supabase
        .from('streaming_links')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'تم', description: 'تم حذف الرابط بنجاح' });
      fetchLinks();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف الرابط',
        variant: 'destructive'
      });
    }
  };

  const handleContentChange = (contentId: string) => {
    setFormData({...formData, content_id: contentId, episode_id: ''});
    if (contentId) {
      fetchEpisodes(contentId);
    } else {
      setEpisodes([]);
    }
  };

  const getLinkTitle = (link: StreamingLink) => {
    if (link.episode) {
      return `${link.episode.season?.content?.title} - الموسم ${link.episode.season?.season_number} - الحلقة ${link.episode.episode_number}`;
    }
    return link.content?.title || 'غير محدد';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الروابط...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة روابط المشاهدة</h2>
          <p className="text-muted-foreground">إضافة وتعديل روابط المشاهدة والتحميل</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة رابط جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingLink ? 'تعديل الرابط' : 'إضافة رابط جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>نوع الرابط</Label>
                <Select
                  value={formData.link_type}
                  onValueChange={(value: 'content' | 'episode') =>
                    setFormData({...formData, link_type: value, content_id: '', episode_id: ''})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content">فيلم أو محتوى كامل</SelectItem>
                    <SelectItem value="episode">حلقة مسلسل</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المحتوى</Label>
                <Select
                  value={formData.content_id}
                  onValueChange={handleContentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المحتوى" />
                  </SelectTrigger>
                  <SelectContent>
                    {content.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title} ({item.content_type === 'movie' ? 'فيلم' : 
                         item.content_type === 'series' ? 'مسلسل' : 'أنمي'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.link_type === 'episode' && episodes.length > 0 && (
                <div className="space-y-2">
                  <Label>الحلقة</Label>
                  <Select
                    value={formData.episode_id}
                    onValueChange={(value) => setFormData({...formData, episode_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent>
                      {episodes.map((episode) => (
                        <SelectItem key={episode.id} value={episode.id}>
                          الحلقة {episode.episode_number}
                          {episode.title && `: ${episode.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الخادم</Label>
                  <Input
                    value={formData.server_name}
                    onChange={(e) => setFormData({...formData, server_name: e.target.value})}
                    placeholder="خادم 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الجودة</Label>
                  <Select
                    value={formData.quality}
                    onValueChange={(value) => setFormData({...formData, quality: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="4K">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>رابط المشاهدة *</Label>
                <Input
                  value={formData.streaming_url}
                  onChange={(e) => setFormData({...formData, streaming_url: e.target.value})}
                  placeholder="https://example.com/video.mp4"
                />
              </div>

              <div className="space-y-2">
                <Label>رابط التحميل</Label>
                <Input
                  value={formData.download_url}
                  onChange={(e) => setFormData({...formData, download_url: e.target.value})}
                  placeholder="https://example.com/download.mp4"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>نشط</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button onClick={handleSubmit}>
                  {editingLink ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="البحث في الروابط..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {filteredLinks.map((link) => (
          <Card key={link.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{getLinkTitle(link)}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Badge variant="secondary">{link.server_name}</Badge>
                    <Badge variant="outline">{link.quality}</Badge>
                    <Badge variant={link.is_active ? "default" : "destructive"}>
                      {link.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      <span>مشاهدة</span>
                    </div>
                    {link.download_url && (
                      <div className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        <span>تحميل</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(link)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد روابط مطابقة للبحث</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}