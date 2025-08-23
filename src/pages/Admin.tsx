import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Users, BarChart3, Film, Tv, Zap, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EnhancedContentManager from '@/components/admin/EnhancedContentManager';
import EpisodeManager from '@/components/admin/EpisodeManager';
import UserManager from '@/components/admin/UserManager';
import EnhancedStreamingLinksManager from '@/components/admin/EnhancedStreamingLinksManager';

interface Stats {
  totalContent: number;
  totalUsers: number;
  totalViews: number;
  totalReviews: number;
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalContent: 0,
    totalUsers: 0,
    totalViews: 0,
    totalReviews: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
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

      setIsAdmin(true);
      fetchStats();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    }
  };

  const fetchStats = async () => {
    try {
      const [contentData, usersData, viewsData, reviewsData] = await Promise.all([
        supabase.from('content').select('id', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('content').select('view_count'),
        supabase.from('reviews').select('id', { count: 'exact' })
      ]);

      const totalViews = viewsData.data?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0;

      setStats({
        totalContent: contentData.count || 0,
        totalUsers: usersData.count || 0,
        totalViews,
        totalReviews: reviewsData.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">لوحة الإدارة</h1>
            <p className="text-muted-foreground">إدارة المحتوى والمستخدمين</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المحتوى</p>
                  <p className="text-2xl font-bold">{stats.totalContent}</p>
                </div>
                <Film className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المستخدمين</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشاهدات</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString('ar')}</p>
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
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="bg-background-secondary">
            <TabsTrigger value="content" className="gap-2">
              <Film className="h-4 w-4" />
              إدارة المحتوى
            </TabsTrigger>
            <TabsTrigger value="episodes" className="gap-2">
              <Tv className="h-4 w-4" />
              إدارة الحلقات
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              إدارة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="streaming" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              روابط المشاهدة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <EnhancedContentManager onStatsUpdate={fetchStats} />
          </TabsContent>

          <TabsContent value="episodes">
            <EpisodeManager />
          </TabsContent>

          <TabsContent value="users">
            <UserManager />
          </TabsContent>

          <TabsContent value="streaming">
            <StreamingLinksManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
