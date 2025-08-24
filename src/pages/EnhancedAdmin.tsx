import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, BarChart3, Film, Tv, Zap, Link as LinkIcon, Settings, Shield, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedContentManager from '@/components/admin/EnhancedContentManager';
import EpisodeManager from '@/components/admin/EpisodeManager';
import UserManager from '@/components/admin/UserManager';
import EnhancedStreamingLinksManager from '@/components/admin/EnhancedStreamingLinksManager';
import InternalServerManager from '@/components/admin/InternalServerManager';

interface Stats {
  totalContent: number;
  totalMovies: number;
  totalSeries: number;
  totalAnime: number;
  totalEpisodes: number;
  totalUsers: number;
  totalViews: number;
  totalReviews: number;
  totalStreamingLinks: number;
  activeLinks: number;
  recentActivity: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant: 'default' | 'outline';
}

export default function EnhancedAdmin() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalContent: 0,
    totalMovies: 0,
    totalSeries: 0,
    totalAnime: 0,
    totalEpisodes: 0,
    totalUsers: 0,
    totalViews: 0,
    totalReviews: 0,
    totalStreamingLinks: 0,
    activeLinks: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast({
          title: 'غير مسموح',
          description: 'ليس لديك صلاحية للوصول لهذه الصفحة',
          variant: 'destructive'
        });
        navigate('/');
        return;
      }

      setUserProfile(profile);
      setIsAdmin(true);
      fetchStats();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchStats = async () => {
    try {
      const [
        contentData,
        episodesData,
        usersData,
        viewsData,
        reviewsData,
        streamingLinksData
      ] = await Promise.all([
        supabase.from('content').select('content_type, view_count'),
        supabase.from('episodes').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('content').select('view_count'),
        supabase.from('reviews').select('id', { count: 'exact' }),
        supabase.from('streaming_links').select('is_active')
      ]);

      const totalViews = viewsData.data?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;
      
      const contentStats = {
        totalMovies: contentData.data?.filter(c => c.content_type === 'movie').length || 0,
        totalSeries: contentData.data?.filter(c => c.content_type === 'series').length || 0,
        totalAnime: contentData.data?.filter(c => c.content_type === 'anime').length || 0
      };

      const streamingStats = {
        totalStreamingLinks: streamingLinksData.data?.length || 0,
        activeLinks: streamingLinksData.data?.filter(link => link.is_active).length || 0
      };

      // حساب النشاط الأخير (آخر 24 ساعة)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentActivity } = await supabase
        .from('content')
        .select('*', { count: 'exact' })
        .gte('created_at', yesterday.toISOString());

      setStats({
        totalContent: contentData.data?.length || 0,
        ...contentStats,
        totalEpisodes: episodesData.count || 0,
        totalUsers: usersData.count || 0,
        totalViews,
        totalReviews: reviewsData.count || 0,
        ...streamingStats,
        recentActivity: recentActivity || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: 'إضافة فيلم جديد',
      description: 'أضف فيلم أو محتوى جديد',
      icon: Film,
      action: () => {
        // يمكن إضافة منطق فتح نموذج إضافة المحتوى مباشرة
      },
      variant: 'default'
    },
    {
      title: 'إضافة حلقة',
      description: 'أضف حلقة جديدة لمسلسل',
      icon: Tv,
      action: () => {
        // يمكن إضافة منطق فتح نموذج إضافة الحلقة مباشرة
      },
      variant: 'outline'
    },
    {
      title: 'إدارة المستخدمين',
      description: 'عرض وإدارة المستخدمين',
      icon: Users,
      action: () => {
        // التبديل إلى تبويب المستخدمين
      },
      variant: 'outline'
    },
    {
      title: 'إضافة روابط',
      description: 'إضافة روابط مشاهدة جديدة',
      icon: LinkIcon,
      action: () => {
        // التبديل إلى تبويب الروابط
      },
      variant: 'outline'
    }
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Shield className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">لوحة التحكم الإدارية</h1>
                <p className="text-white/80">مرحباً بك، {userProfile?.full_name || 'المدير'}</p>
              </div>
            </div>
            
            <div className="text-left">
              <div className="text-lg font-semibold">{formatTime(currentTime)}</div>
              <div className="text-white/80 text-sm">{formatDate(currentTime)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المحتوى</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalContent}</p>
                </div>
                <Film className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الأفلام</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalMovies}</p>
                </div>
                <Film className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المسلسلات</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalSeries}</p>
                </div>
                <Tv className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الأنمي</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.totalAnime}</p>
                </div>
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">الحلقات</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.totalEpisodes}</p>
                </div>
                <Calendar className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/10 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المستخدمين</p>
                  <p className="text-2xl font-bold text-rose-600">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-rose-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات تفصيلية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشاهدات</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString('ar')}</p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="h-3 w-3 inline ml-1" />
                    نمو مستمر
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">التقييمات</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                  <p className="text-xs text-blue-600 mt-1">تفاعل المستخدمين</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">روابط المشاهدة</p>
                  <p className="text-2xl font-bold">{stats.totalStreamingLinks}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {stats.activeLinks} نشط
                  </p>
                </div>
                <LinkIcon className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">نشاط اليوم</p>
                  <p className="text-2xl font-bold">{stats.recentActivity}</p>
                  <p className="text-xs text-muted-foreground mt-1">إضافات جديدة</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إجراءات سريعة */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  className="h-auto p-4 flex flex-col items-start gap-2"
                  onClick={action.action}
                >
                  <action.icon className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">{action.title}</div>
                    <div className="text-xs opacity-70">{action.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* تبويبات الإدارة */}
        <Tabs defaultValue="content" className="space-y-6">
          <div className="bg-card rounded-lg border">
            <TabsList className="w-full justify-start bg-transparent p-2">
              <TabsTrigger value="content" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Film className="h-4 w-4" />
                إدارة المحتوى
              </TabsTrigger>
              <TabsTrigger value="episodes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Tv className="h-4 w-4" />
                إدارة الحلقات
              </TabsTrigger>
              <TabsTrigger value="streaming" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LinkIcon className="h-4 w-4" />
                روابط المشاهدة
              </TabsTrigger>
              <TabsTrigger value="servers" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings className="h-4 w-4" />
                إدارة السيرفرات
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Users className="h-4 w-4" />
                إدارة المستخدمين
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="content" className="mt-6">
            <EnhancedContentManager onStatsUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="episodes" className="mt-6">
            <EpisodeManager />
          </TabsContent>

          <TabsContent value="streaming" className="mt-6">
            <EnhancedStreamingLinksManager />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
