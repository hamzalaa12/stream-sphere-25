import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Link as LinkIcon, Play, Download, ArrowUp, ArrowDown, Eye, EyeOff, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamingLink {
  id: string;
  streaming_url: string;
  download_url?: string;
  server_name: string;
  quality: string;
  is_active: boolean;
  server_order?: number;
  link_type: 'streaming' | 'download';
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

interface ServerStats {
  total: number;
  active: number;
  inactive: number;
  byQuality: Record<string, number>;
  byServer: Record<string, number>;
}

export default function EnhancedStreamingLinksManager() {
  const { toast } = useToast();
  const [links, setLinks] = useState<StreamingLink[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<StreamingLink[]>([]);
  const [content, setContent] = useState<Content[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterQuality, setFilterQuality] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterServer, setFilterServer] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<StreamingLink | null>(null);
  const [stats, setStats] = useState<ServerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    byQuality: {},
    byServer: {}
  });

  const [formData, setFormData] = useState({
    streaming_url: '',
    download_url: '',
    server_name: '',
    quality: '720p',
    is_active: true,
    server_order: 1,
    link_type: 'streaming' as 'streaming' | 'download',
    content_id: '',
    episode_id: '',
    target_type: 'content' as 'content' | 'episode'
  });

  const popularServers = [
    'Streamtape', 'Vidcloud', 'Fembed', 'Upstream', 'Vidoza', 
    'MyViid', 'Uqload', 'OpenLoad', 'Doodstream', 'Mixdrop'
  ];

  const qualityOptions = ['360p', '480p', '720p', '1080p', '1440p', '2160p'];

  useEffect(() => {
    fetchLinks();
    fetchContent();
  }, []);

  useEffect(() => {
    filterLinks();
    calculateStats();
  }, [links, searchTerm, filterQuality, filterStatus, filterServer]);

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
        .order('server_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // إضافة معلومات نوع الرابط للروابط الموجودة
      const processedLinks = (data || []).map(link => ({
        ...link,
        link_type: link.download_url ? 'download' : 'streaming',
        server_order: link.server_order || 999
      }));
      
      setLinks(processedLinks);
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

  const calculateStats = () => {
    const newStats: ServerStats = {
      total: filteredLinks.length,
      active: filteredLinks.filter(link => link.is_active).length,
      inactive: filteredLinks.filter(link => !link.is_active).length,
      byQuality: {},
      byServer: {}
    };

    filteredLinks.forEach(link => {
      newStats.byQuality[link.quality] = (newStats.byQuality[link.quality] || 0) + 1;
      newStats.byServer[link.server_name] = (newStats.byServer[link.server_name] || 0) + 1;
    });

    setStats(newStats);
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

    if (filterQuality !== 'all') {
      filtered = filtered.filter(link => link.quality === filterQuality);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(link => link.is_active);
      } else {
        filtered = filtered.filter(link => !link.is_active);
      }
    }

    if (filterServer !== 'all') {
      filtered = filtered.filter(link => link.server_name === filterServer);
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
      server_order: 1,
      link_type: 'streaming',
      content_id: '',
      episode_id: '',
      target_type: 'content'
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

    if (formData.target_type === 'content' && !formData.content_id) {
      toast({
        title: 'خطأ',
        description: 'يجب اختيار المحتوى',
        variant: 'destructive'
      });
      return;
    }

    if (formData.target_type === 'episode' && !formData.episode_id) {
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
        download_url: formData.link_type === 'download' ? formData.download_url || formData.streaming_url : null,
        server_name: formData.server_name,
        quality: formData.quality,
        is_active: formData.is_active,
        server_order: formData.server_order,
        content_id: formData.target_type === 'content' ? formData.content_id : null,
        episode_id: formData.target_type === 'episode' ? formData.episode_id : null
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
      server_order: link.server_order || 1,
      link_type: link.download_url ? 'download' : 'streaming',
      content_id: link.content_id || '',
      episode_id: link.episode_id || '',
      target_type: link.episode_id ? 'episode' : 'content'
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

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('streaming_links')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: 'تم', 
        description: `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} الرابط بنجاح` 
      });
      fetchLinks();
    } catch (error) {
      console.error('Error toggling link status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير حالة الرابط',
        variant: 'destructive'
      });
    }
  };

  const handleMoveServer = async (id: string, direction: 'up' | 'down') => {
    const link = links.find(l => l.id === id);
    if (!link) return;

    const newOrder = direction === 'up' ? Math.max(1, link.server_order - 1) : link.server_order + 1;

    try {
      const { error } = await supabase
        .from('streaming_links')
        .update({ server_order: newOrder })
        .eq('id', id);

      if (error) throw error;
      fetchLinks();
    } catch (error) {
      console.error('Error updating server order:', error);
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

  const getUniqueServers = () => {
    const servers = [...new Set(links.map(link => link.server_name))];
    return servers.sort();
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
      {/* إحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الروابط</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <LinkIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">نشط</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">غير نشط</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <EyeOff className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">خوادم مختلفة</p>
                <p className="text-2xl font-bold">{Object.keys(stats.byServer).length}</p>
              </div>
              <Settings className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة روابط المشاهدة والتحميل</h2>
          <p className="text-muted-foreground">إضافة وتعديل روابط المشاهدة والتحميل مع إدارة السيرفرات</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingLink ? 'تعديل الرابط' : 'إضافة رابط جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* معلومات أساسية */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">معلومات السيرفر</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم السيرفر *</Label>
                    <Select
                      value={formData.server_name}
                      onValueChange={(value) => setFormData({...formData, server_name: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر السيرفر" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularServers.map((server) => (
                          <SelectItem key={server} value={server}>{server}</SelectItem>
                        ))}
                        <SelectItem value="Other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>جودة الفيديو *</Label>
                    <Select
                      value={formData.quality}
                      onValueChange={(value) => setFormData({...formData, quality: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityOptions.map((quality) => (
                          <SelectItem key={quality} value={quality}>{quality}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع الرابط</Label>
                    <Select
                      value={formData.link_type}
                      onValueChange={(value: 'streaming' | 'download') => 
                        setFormData({...formData, link_type: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="streaming">مشاهدة مباشرة</SelectItem>
                        <SelectItem value="download">تحميل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ترتيب السيرفر</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.server_order}
                      onChange={(e) => setFormData({...formData, server_order: parseInt(e.target.value) || 1})}
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* اختيار المحتوى */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">المحتوى المستهدف</h3>
                </div>

                <div className="space-y-2">
                  <Label>نوع المحتوى</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(value: 'content' | 'episode') =>
                      setFormData({...formData, target_type: value, content_id: '', episode_id: ''})
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
                  <Label>المحتوى *</Label>
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

                {formData.target_type === 'episode' && episodes.length > 0 && (
                  <div className="space-y-2">
                    <Label>الحلقة *</Label>
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
              </div>

              <Separator />

              {/* الروابط */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">الروابط</h3>
                </div>

                <div className="space-y-2">
                  <Label>
                    {formData.link_type === 'streaming' ? 'رابط المشاهدة' : 'رابط التحميل'} *
                  </Label>
                  <Input
                    value={formData.streaming_url}
                    onChange={(e) => setFormData({...formData, streaming_url: e.target.value})}
                    placeholder="https://example.com/video.mp4"
                  />
                </div>

                {formData.link_type === 'download' && (
                  <div className="space-y-2">
                    <Label>رابط تحميل إضافي (اختياري)</Label>
                    <Input
                      value={formData.download_url}
                      onChange={(e) => setFormData({...formData, download_url: e.target.value})}
                      placeholder="https://example.com/download-alt.mp4"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label>نشط</Label>
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
                  {editingLink ? 'تحديث' : 'إضافة'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* البحث والفلاتر */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث في الروابط..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterQuality} onValueChange={setFilterQuality}>
          <SelectTrigger>
            <SelectValue placeholder="فلترة بالجودة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الجودات</SelectItem>
            {qualityOptions.map((quality) => (
              <SelectItem key={quality} value={quality}>{quality}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="فلترة بالحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={filterServer} onValueChange={setFilterServer}>
          <SelectTrigger>
            <SelectValue placeholder="فلترة بالسيرفر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع السيرفرات</SelectItem>
            {getUniqueServers().map((server) => (
              <SelectItem key={server} value={server}>{server}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* قائمة الروابط */}
      <div className="space-y-4">
        {filteredLinks.map((link) => (
          <Card key={link.id} className={`transition-all ${!link.is_active ? 'opacity-60' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{getLinkTitle(link)}</h3>
                    <Badge variant={link.is_active ? "default" : "secondary"}>
                      #{link.server_order || 999}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Badge variant="secondary">{link.server_name}</Badge>
                    <Badge variant="outline">{link.quality}</Badge>
                    <Badge variant={link.download_url ? "default" : "secondary"}>
                      {link.download_url ? 'تحميل' : 'مشاهدة'}
                    </Badge>
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
                        <Download className="h-3 w-3" />
                        <span>تحميل</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* أزرار ترتيب السيرفر */}
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveServer(link.id, 'up')}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveServer(link.id, 'down')}
                      className="h-6 w-6 p-0"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* تفعيل/إلغاء تفعيل */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(link.id, link.is_active)}
                    className={link.is_active ? 'text-green-600' : 'text-red-600'}
                  >
                    {link.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>

                  {/* تعديل */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(link)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {/* حذف */}
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
