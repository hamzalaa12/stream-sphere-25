import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, AlertTriangle, Info, CheckCircle, X, 
  Settings, Filter, Search, Clock, Users, 
  Activity, TrendingUp, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'content' | 'users' | 'security' | 'performance';
  timestamp: string;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationSettings {
  enablePush: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  categories: {
    system: boolean;
    content: boolean;
    users: boolean;
    security: boolean;
    performance: boolean;
  };
  priorities: {
    low: boolean;
    medium: boolean;
    high: boolean;
    critical: boolean;
  };
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    enablePush: true,
    enableEmail: true,
    enableSMS: false,
    categories: {
      system: true,
      content: true,
      users: true,
      security: true,
      performance: true
    },
    priorities: {
      low: true,
      medium: true,
      high: true,
      critical: true
    }
  });

  useEffect(() => {
    generateMockNotifications();
    const interval = setInterval(checkForNewNotifications, 30000); // فحص كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, searchTerm, filterType, filterCategory, showUnreadOnly]);

  const generateMockNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'تحديث أمني مهم',
        message: 'تم اكتشاف محاولة دخول غير مصرح بها من IP: 192.168.1.100',
        type: 'error',
        priority: 'critical',
        category: 'security',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/admin/security'
      },
      {
        id: '2',
        title: 'محتوى جديد في انتظار الموافقة',
        message: 'تم رفع 3 أفلام جديدة وتحتاج للمراجعة والموافقة',
        type: 'info',
        priority: 'medium',
        category: 'content',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/admin/content'
      },
      {
        id: '3',
        title: 'زيادة في حركة المرور',
        message: 'زيادة 150% في عدد المشاهدات مقارنة بالأسبوع الماضي',
        type: 'success',
        priority: 'low',
        category: 'performance',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: true,
        actionRequired: false
      },
      {
        id: '4',
        title: 'مساحة التخزين منخفضة',
        message: 'الخادم الرئيسي وصل إلى 85% من سعة التخزين',
        type: 'warning',
        priority: 'high',
        category: 'system',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/admin/servers'
      },
      {
        id: '5',
        title: 'مستخدم جديد مميز',
        message: 'انضم مستخدم بريميوم جديد - إجمالي المشتركين: 1,245',
        type: 'success',
        priority: 'low',
        category: 'users',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        read: true,
        actionRequired: false
      },
      {
        id: '6',
        title: 'فشل في رفع الفيديو',
        message: 'فشل في معالجة ملف "فيلم الأكشن الجديد" - خطأ في الترميز',
        type: 'error',
        priority: 'medium',
        category: 'content',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: false,
        actionRequired: true,
        actionUrl: '/admin/uploads'
      }
    ];

    setNotifications(mockNotifications);
    setLoading(false);
  };

  const checkForNewNotifications = async () => {
    // هنا يمكن إضافة منطق فحص التحديثات الحقيقية من قاعدة البيانات
    try {
      // فحص الأحداث الجديدة
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // فحص المحتوى الجديد
      const { count: newContent } = await supabase
        .from('content')
        .select('*', { count: 'exact' })
        .gte('created_at', fiveMinutesAgo.toISOString());

      if (newContent && newContent > 0) {
        const newNotification: Notification = {
          id: Date.now().toString(),
          title: 'محتوى جديد',
          message: `تم إضافة ${newContent} محتوى جديد`,
          type: 'info',
          priority: 'low',
          category: 'content',
          timestamp: now.toISOString(),
          read: false,
          actionRequired: false
        };
        
        setNotifications(prev => [newNotification, ...prev]);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (searchTerm) {
      filtered = filtered.filter(notif =>
        notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notif.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(notif => notif.type === filterType);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(notif => notif.category === filterCategory);
    }

    if (showUnreadOnly) {
      filtered = filtered.filter(notif => !notif.read);
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-500 bg-red-500/10';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10';
      case 'success': return 'text-green-500 bg-green-500/10';
      case 'info': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return <Settings className="h-4 w-4" />;
      case 'content': return <Activity className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-8 w-8 text-primary" />
            {unreadCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold">مركز التنبيهات</h2>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} تنبيه غير مقروء` : 'جميع التنبيهات مقروءة'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            تحديد الكل كمقروء
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث في التنبيهات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="نوع التنبيه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="error">أخطاء</SelectItem>
                <SelectItem value="warning">تحذيرات</SelectItem>
                <SelectItem value="info">معلومات</SelectItem>
                <SelectItem value="success">نجاح</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                <SelectItem value="system">النظام</SelectItem>
                <SelectItem value="content">المحتوى</SelectItem>
                <SelectItem value="users">المستخدمين</SelectItem>
                <SelectItem value="security">الأمان</SelectItem>
                <SelectItem value="performance">الأداء</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Switch
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={setShowUnreadOnly}
              />
              <Label htmlFor="unread-only">غير مقروء فقط</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredNotifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`
                bg-gradient-card border-0 transition-all duration-300 hover:shadow-elevated
                ${!notification.read ? 'ring-2 ring-primary/20' : ''}
              `}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Priority Indicator */}
                    <div className={`w-1 h-full rounded-full ${getPriorityColor(notification.priority)}`} />
                    
                    {/* Icon */}
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="gap-1">
                              {getCategoryIcon(notification.category)}
                              {notification.category}
                            </Badge>
                            
                            <Badge variant="secondary">
                              {notification.priority}
                            </Badge>
                            
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(notification.timestamp), { 
                                addSuffix: true, 
                                locale: ar 
                              })}
                            </div>
                            
                            {notification.actionRequired && (
                              <Badge variant="destructive" className="gap-1">
                                <Zap className="h-3 w-3" />
                                يتطلب إجراء
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {notification.actionRequired && notification.actionUrl && (
                            <Button size="sm" variant="outline">
                              اتخاذ إجراء
                            </Button>
                          )}
                          
                          {!notification.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsRead(notification.id)}
                            >
                              تحديد كمقروء
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredNotifications.length === 0 && (
        <Card className="bg-gradient-card border-0">
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد تنبيهات مطابقة للمعايير المحددة</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}