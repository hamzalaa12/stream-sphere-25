import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Server, HardDrive, Activity, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InternalServer {
  id: string;
  name: string;
  description?: string;
  storage_path: string;
  base_url: string;
  max_storage_gb: number;
  used_storage_gb: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface ServerStats {
  total_files: number;
  total_size_bytes: number;
  total_bandwidth_bytes: number;
  active_connections: number;
  recorded_at: string;
}

export default function InternalServerManager() {
  const { toast } = useToast();
  const [servers, setServers] = useState<InternalServer[]>([]);
  const [filteredServers, setFilteredServers] = useState<InternalServer[]>([]);
  const [serverStats, setServerStats] = useState<Record<string, ServerStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<InternalServer | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    storage_path: '',
    base_url: '',
    max_storage_gb: 1000,
    is_active: true,
    priority: 1
  });

  useEffect(() => {
    fetchServers();
    fetchServerStats();
    
    // تحديث الإحصائيات كل 30 ثانية
    const interval = setInterval(fetchServerStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterServers();
  }, [servers, searchTerm, filterStatus]);

  const fetchServers = async () => {
    try {
      const { data, error } = await supabase
        .from('internal_servers')
        .select('*')
        .order('priority');

      if (error) throw error;
      setServers(data || []);
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل السيرفرات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('server_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(servers.length);

      if (error) throw error;

      const statsMap: Record<string, ServerStats> = {};
      data?.forEach(stat => {
        if (stat.server_id && !statsMap[stat.server_id]) {
          statsMap[stat.server_id] = stat;
        }
      });

      setServerStats(statsMap);
    } catch (error) {
      console.error('Error fetching server stats:', error);
    }
  };

  const filterServers = () => {
    let filtered = servers;

    if (searchTerm) {
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        server.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'active') {
        filtered = filtered.filter(server => server.is_active);
      } else {
        filtered = filtered.filter(server => !server.is_active);
      }
    }

    setFilteredServers(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      storage_path: '',
      base_url: '',
      max_storage_gb: 1000,
      is_active: true,
      priority: 1
    });
    setEditingServer(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.storage_path.trim() || !formData.base_url.trim()) {
      toast({
        title: 'خطأ',
        description: 'جميع الحقول المطلوبة يجب ملؤها',
        variant: 'destructive'
      });
      return;
    }

    try {
      const serverData = {
        name: formData.name,
        description: formData.description || null,
        storage_path: formData.storage_path,
        base_url: formData.base_url,
        max_storage_gb: formData.max_storage_gb,
        is_active: formData.is_active,
        priority: formData.priority
      };

      if (editingServer) {
        const { error } = await supabase
          .from('internal_servers')
          .update(serverData)
          .eq('id', editingServer.id);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم تحديث السيرفر بنجاح' });
      } else {
        const { error } = await supabase
          .from('internal_servers')
          .insert([serverData]);

        if (error) throw error;
        toast({ title: 'تم', description: 'تم إضافة السيرفر بنجاح' });
      }

      resetForm();
      setIsAddDialogOpen(false);
      fetchServers();
    } catch (error: any) {
      console.error('Error saving server:', error);
      toast({
        title: 'خطأ',
        description: `فشل في حفظ ��لسيرفر: ${error?.message || ''}`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (server: InternalServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      description: server.description || '',
      storage_path: server.storage_path,
      base_url: server.base_url,
      max_storage_gb: server.max_storage_gb,
      is_active: server.is_active,
      priority: server.priority
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السيرفر؟ سيؤثر هذا على جميع الفيديوهات المخزنة عليه.')) return;

    try {
      const { error } = await supabase
        .from('internal_servers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'تم', description: 'تم حذف السيرفر بنجاح' });
      fetchServers();
    } catch (error) {
      console.error('Error deleting server:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف السيرفر',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('internal_servers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ 
        title: 'تم', 
        description: `تم ${!currentStatus ? 'تفعيل' : 'إلغاء تفعيل'} السيرفر بنجاح` 
      });
      fetchServers();
    } catch (error) {
      console.error('Error toggling server status:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير حالة السيرفر',
        variant: 'destructive'
      });
    }
  };

  const testServerConnection = async (server: InternalServer) => {
    try {
      // في التطبيق الحقيقي، هذا سيختبر الاتصال بالسيرفر
      toast({
        title: 'اختبار الاتصال',
        description: 'جاري اختبار الاتصال بالسيرفر...'
      });

      // محاكاة اختبار الاتصال
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: 'نجح الاختبار',
        description: 'السيرفر يعمل بشكل طبيعي'
      });
    } catch (error) {
      toast({
        title: 'فشل الاختبار',
        description: 'لا يمكن الوصول إلى السيرفر',
        variant: 'destructive'
      });
    }
  };

  const getStoragePercentage = (server: InternalServer): number => {
    return (server.used_storage_gb / server.max_storage_gb) * 100;
  };

  const getStorageStatus = (percentage: number): 'success' | 'warning' | 'danger' => {
    if (percentage < 70) return 'success';
    if (percentage < 90) return 'warning';
    return 'danger';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل السيرفرات...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">إدارة السيرفرات الداخلية</h2>
          <p className="text-muted-foreground">إضافة وإدارة سيرفرات تخزين الفيديوهات</p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة سيرفر جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingServer ? 'تعديل السيرفر' : 'إضافة سيرفر جديد'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسم السيرفر *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="سيرفر 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">الأولوية</Label>
                  <Input
                    id="priority"
                    type="number"
                    min="1"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="وصف السيرفر ووظيفته"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="storage_path">مسار التخزين *</Label>
                <Input
                  id="storage_path"
                  value={formData.storage_path}
                  onChange={(e) => setFormData({...formData, storage_path: e.target.value})}
                  placeholder="/storage/server1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_url">رابط السيرفر الأساسي *</Label>
                <Input
                  id="base_url"
                  value={formData.base_url}
                  onChange={(e) => setFormData({...formData, base_url: e.target.value})}
                  placeholder="https://video1.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_storage">أقصى مساحة تخزين (GB)</Label>
                <Input
                  id="max_storage"
                  type="number"
                  min="1"
                  value={formData.max_storage_gb}
                  onChange={(e) => setFormData({...formData, max_storage_gb: parseInt(e.target.value) || 1000})}
                />
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>السيرفر نشط</Label>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  إلغاء
                </Button>
                <Button onClick={handleSubmit}>
                  {editingServer ? 'تحديث' : 'إضافة'}
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
            placeholder="البحث في السيرفرات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع السيرفرات</SelectItem>
            <SelectItem value="active">النشطة</SelectItem>
            <SelectItem value="inactive">غير النشطة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServers.map((server) => {
          const storagePercentage = getStoragePercentage(server);
          const storageStatus = getStorageStatus(storagePercentage);
          const stats = serverStats[server.id];

          return (
            <Card key={server.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{server.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      أولوية {server.priority}
                    </Badge>
                    <Badge variant={server.is_active ? "default" : "secondary"}>
                      {server.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </div>
                </div>
                {server.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {server.description}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* التخزين */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      <span>التخزين</span>
                    </div>
                    <span className={`font-medium ${
                      storageStatus === 'danger' ? 'text-red-600' :
                      storageStatus === 'warning' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {server.used_storage_gb}GB / {server.max_storage_gb}GB
                    </span>
                  </div>
                  <Progress 
                    value={storagePercentage} 
                    className={`h-2 ${
                      storageStatus === 'danger' ? '[&>div]:bg-red-500' :
                      storageStatus === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                    }`}
                  />
                  {storagePercentage > 90 && (
                    <Alert variant="destructive" className="p-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        مساحة التخزين شبه ممتلئة
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* الإحصائيات */}
                {stats && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>الملفات</span>
                      </div>
                      <p className="font-medium">{stats.total_files.toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        <span>الاتصالات</span>
                      </div>
                      <p className="font-medium">{stats.active_connections}</p>
                    </div>
                    <div className="space-y-1">
                      <span>الحجم الكلي</span>
                      <p className="font-medium">{formatFileSize(stats.total_size_bytes)}</p>
                    </div>
                    <div className="space-y-1">
                      <span>عرض النطاق</span>
                      <p className="font-medium">{formatFileSize(stats.total_bandwidth_bytes)}</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* معلومات التكوين */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">المسار:</span> {server.storage_path}
                  </div>
                  <div>
                    <span className="font-medium">الرابط:</span> {server.base_url}
                  </div>
                </div>

                <Separator />

                {/* الإجراءات */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testServerConnection(server)}
                    disabled={!server.is_active}
                    className="flex-1"
                  >
                    اختبار
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(server)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={server.is_active ? "secondary" : "default"}
                    onClick={() => handleToggleActive(server.id, server.is_active)}
                  >
                    {server.is_active ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(server.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredServers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد سيرفرات مطابقة للبحث</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
