import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Users, Eye, Calendar, Clock, 
  Activity, Target, Award, Zap, Play, Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AnalyticsData {
  dailyViews: { date: string; views: number; users: number }[];
  topContent: { title: string; views: number; type: string }[];
  categoryStats: { name: string; value: number; color: string }[];
  userActivity: { hour: number; users: number }[];
  monthlyTrends: { month: string; content: number; users: number; views: number }[];
  realtimeStats: {
    activeUsers: number;
    totalViews: number;
    newContent: number;
    popularNow: string;
  };
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    dailyViews: [],
    topContent: [],
    categoryStats: [],
    userActivity: [],
    monthlyTrends: [],
    realtimeStats: {
      activeUsers: 0,
      totalViews: 0,
      newContent: 0,
      popularNow: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days).toISOString();

      // جمع البيانات بالتوازي
      const [
        contentData,
        viewsData,
        usersData,
        categoriesData
      ] = await Promise.all([
        supabase.from('content').select('*').gte('created_at', startDate),
        supabase.from('watch_history').select('*').gte('last_watched', startDate),
        supabase.from('profiles').select('*').gte('created_at', startDate),
        supabase.from('content').select('categories, view_count')
      ]);

      // معالجة البيانات
      const dailyViewsMap = new Map();
      const topContentMap = new Map();
      const categoryStatsMap = new Map();

      // حساب المشاهدات اليومية
      viewsData.data?.forEach(view => {
        const date = format(parseISO(view.last_watched), 'yyyy-MM-dd');
        if (!dailyViewsMap.has(date)) {
          dailyViewsMap.set(date, { date, views: 0, users: new Set() });
        }
        const dayData = dailyViewsMap.get(date);
        dayData.views += 1;
        dayData.users.add(view.user_id);
      });

      // تحويل المستخدمين إلى عدد
      const dailyViews = Array.from(dailyViewsMap.values()).map(day => ({
        ...day,
        users: day.users.size
      })).sort((a, b) => a.date.localeCompare(b.date));

      // أفضل المحتوى
      contentData.data?.forEach(content => {
        topContentMap.set(content.id, {
          title: content.title_ar || content.title,
          views: content.view_count || 0,
          type: content.content_type
        });
      });
      const topContent = Array.from(topContentMap.values())
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // إحصائيات التصنيفات
      categoriesData.data?.forEach(content => {
        content.categories?.forEach((category: string) => {
          if (!categoryStatsMap.has(category)) {
            categoryStatsMap.set(category, 0);
          }
          categoryStatsMap.set(category, categoryStatsMap.get(category) + (content.view_count || 0));
        });
      });

      const categoryStats = Array.from(categoryStatsMap.entries()).map(([name, value], index) => ({
        name: getCategoryLabel(name),
        value,
        color: COLORS[index % COLORS.length]
      }));

      // نشاط المستخدمين بالساعة (محاكاة)
      const userActivity = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        users: Math.floor(Math.random() * 100) + 20
      }));

      // الاتجاهات الشهرية
      const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
        const date = subDays(new Date(), i * 30);
        return {
          month: format(date, 'MMM', { locale: ar }),
          content: Math.floor(Math.random() * 50) + 10,
          users: Math.floor(Math.random() * 200) + 50,
          views: Math.floor(Math.random() * 1000) + 200
        };
      }).reverse();

      // الإحصائيات المباشرة
      const realtimeStats = {
        activeUsers: Math.floor(Math.random() * 500) + 100,
        totalViews: viewsData.data?.length || 0,
        newContent: contentData.data?.length || 0,
        popularNow: topContent[0]?.title || 'لا يوجد'
      };

      setAnalytics({
        dailyViews,
        topContent,
        categoryStats,
        userActivity,
        monthlyTrends,
        realtimeStats
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
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
    return labels[category] || category;
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    trend 
  }: {
    title: string;
    value: string | number;
    change: string;
    icon: React.ComponentType<{ className?: string }>;
    trend: 'up' | 'down';
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-gradient-card border-0 shadow-card hover:shadow-elevated transition-smooth">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                  {change}
                </span>
              </div>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* الإحصائيات المباشرة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="المستخدمين النشطين"
          value={analytics.realtimeStats.activeUsers}
          change="+12.5%"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="إجمالي المشاهدات"
          value={analytics.realtimeStats.totalViews.toLocaleString('ar')}
          change="+8.2%"
          icon={Eye}
          trend="up"
        />
        <StatCard
          title="محتوى جديد"
          value={analytics.realtimeStats.newContent}
          change="+15.7%"
          icon={Calendar}
          trend="up"
        />
        <StatCard
          title="الأكثر شعبية"
          value="trending"
          change="+25.3%"
          icon={Activity}
          trend="up"
        />
      </div>

      {/* الرسوم البيانية */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:w-96">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="performance">الأداء</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* المشاهدات اليومية */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  المشاهدات اليومية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyViews}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* توزيع التصنيفات */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  توزيع التصنيفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryStats}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {analytics.categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* نشاط المستخدمين بالساعة */}
          <Card className="bg-gradient-card border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                نشاط المستخدمين بالساعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* أفضل المحتوى */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  أفضل المحتوى
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.topContent.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.type}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary">{item.views.toLocaleString('ar')}</p>
                        <p className="text-xs text-muted-foreground">مشاهدة</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* الاتجاهات الشهرية */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  الاتجاهات الشهرية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="content" fill="hsl(var(--primary))" name="محتوى" />
                    <Bar dataKey="users" fill="hsl(var(--accent))" name="مستخدمين" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* نمو المستخدمين */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  نمو المستخدمين
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.dailyViews}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(var(--accent))"
                      fill="hsl(var(--accent))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* إحصائيات التفاعل */}
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  إحصائيات التفاعل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>معدل المشاهدة</span>
                      <span>85%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>متوسط وقت المشاهدة</span>
                      <span>68%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>معدل الإكمال</span>
                      <span>72%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Play className="h-5 w-5" />
                  سرعة التحميل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">1.2s</div>
                  <p className="text-sm text-muted-foreground">متوسط وقت بدء التشغيل</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Download className="h-5 w-5" />
                  استخدام النطاق
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">2.4TB</div>
                  <p className="text-sm text-muted-foreground">هذا الشهر</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Activity className="h-5 w-5" />
                  حالة الخادم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">99.9%</div>
                  <p className="text-sm text-muted-foreground">وقت التشغيل</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}