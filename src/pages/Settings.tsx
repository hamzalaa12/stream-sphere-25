import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Bell, Palette, Globe, Monitor, Moon, Sun, Smartphone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserSettings {
  notifications: boolean;
  autoplay: boolean;
  quality: string;
  language: string;
  theme: string;
  privacy_mode: boolean;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    notifications: true,
    autoplay: false,
    quality: '1080p',
    language: 'ar',
    theme: 'system',
    privacy_mode: false
  });

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      fetchSettings();
    }
  }, [user, authLoading]);

  const fetchSettings = async () => {
    try {
      // Since we don't have a settings table yet, we'll use default values
      // In a real app, you'd fetch from a user_settings table
      setSettings({
        notifications: true,
        autoplay: false,
        quality: '1080p',
        language: 'ar',
        theme: 'system',
        privacy_mode: false
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    setSaving(true);
    try {
      // In a real app, you'd save to a user_settings table
      // For now, we'll just store in localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعداداتك بنجاح',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء حفظ الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: 'تم تسجيل الخروج',
        description: 'تم تسجيل خروجك بنجاح',
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تسجيل الخروج',
        variant: 'destructive'
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة إعدادات حسابك وتفضيلاتك</p>
          </div>
          <Button onClick={updateSettings} disabled={saving}>
            <Save className="h-4 w-4 ml-2" />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="bg-background-secondary">
            <TabsTrigger value="account" className="gap-2">
              <User className="h-4 w-4" />
              الحساب
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2">
              <Monitor className="h-4 w-4" />
              العرض
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Shield className="h-4 w-4" />
              الخصوصية
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              الإشعارات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>معلومات الحساب</CardTitle>
                <CardDescription>إدارة معلومات حسابك الشخصية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="language">اللغة</Label>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إدارة الحساب</CardTitle>
                <CardDescription>خيارات الحساب المتقدمة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="destructive" onClick={handleSignOut}>
                  تسجيل الخروج
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات العرض</CardTitle>
                <CardDescription>تخصيص مظهر التطبيق</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>المظهر</Label>
                    <p className="text-sm text-muted-foreground">اختر مظهر التطبيق</p>
                  </div>
                  <Select
                    value={settings.theme}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, theme: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          فاتح
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          داكن
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          تلقائي
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>جودة التشغيل الافتراضية</Label>
                    <p className="text-sm text-muted-foreground">جودة الفيديو المفضلة</p>
                  </div>
                  <Select
                    value={settings.quality}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1080p">1080p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="auto">تلقائي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>التشغيل التلقائي</Label>
                    <p className="text-sm text-muted-foreground">تشغيل الحلقة التالية تلقائياً</p>
                  </div>
                  <Switch
                    checked={settings.autoplay}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoplay: checked }))}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الخصوصية</CardTitle>
                <CardDescription>التحكم في خصوصيتك وبياناتك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>الوضع الخاص</Label>
                    <p className="text-sm text-muted-foreground">عدم حفظ سجل المشاهدة</p>
                  </div>
                  <Switch
                    checked={settings.privacy_mode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, privacy_mode: checked }))}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">إدارة البيانات</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      تنزيل بياناتي
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      مسح سجل المشاهدة
                    </Button>
                    <Button variant="destructive" className="w-full justify-start">
                      حذف الحساب
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات الإشعارات</CardTitle>
                <CardDescription>التحكم في الإشعارات التي تتلقاها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>تفعيل الإشعارات</Label>
                    <p className="text-sm text-muted-foreground">استقبال إشعارات عامة</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifications: checked }))}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">أنواع الإشعارات</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>محتوى جديد</Label>
                        <p className="text-sm text-muted-foreground">إشعارات عند إضافة محتوى جديد</p>
                      </div>
                      <Switch disabled={!settings.notifications} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>حلقات جديدة</Label>
                        <p className="text-sm text-muted-foreground">إشعارات عند إضافة حلقات جديدة</p>
                      </div>
                      <Switch disabled={!settings.notifications} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>تحديثات النظام</Label>
                        <p className="text-sm text-muted-foreground">إشعارات التحديثات والصيانة</p>
                      </div>
                      <Switch disabled={!settings.notifications} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}