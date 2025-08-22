import React, { useState, useEffect } from 'react';
import { User, Heart, Clock, Settings, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContentCard } from '@/components/content/ContentCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  role: string;
}

interface FavoriteContent {
  id: string;
  content_id: string;
  content: {
    id: string;
    title: string;
    title_en?: string;
    poster_url?: string;
    rating: number;
    content_type: string;
    categories: string[];
    release_date?: string;
  };
}

interface WatchHistoryItem {
  id: string;
  content_id?: string;
  episode_id?: string;
  watch_time: number;
  last_watched: string;
  completed: boolean;
  content?: {
    id: string;
    title: string;
    title_en?: string;
    poster_url?: string;
    rating: number;
    content_type: string;
    categories: string[];
    release_date?: string;
  };
  episode?: {
    id: string;
    episode_number: number;
    title?: string;
    season: {
      season_number: number;
      content: {
        id: string;
        title: string;
        poster_url?: string;
      };
    };
  };
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteContent[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchFavorites();
      fetchWatchHistory();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        username: data.username || '',
        avatar_url: data.avatar_url || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          content:content (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchWatchHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select(`
          *,
          content:content (*),
          episode:episodes (
            *,
            season:seasons (
              season_number,
              content:content (*)
            )
          )
        `)
        .eq('user_id', user.id)
        .order('last_watched', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWatchHistory(data || []);
    } catch (error) {
      console.error('Error fetching watch history:', error);
    }
  };

  const updateProfile = async () => {
    if (!user || !profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim() || null,
          username: formData.username.trim() || null,
          avatar_url: formData.avatar_url.trim() || null
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'تم',
        description: 'تم تحديث الملف الشخصي بنجاح'
      });

      setEditMode(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث الملف الشخصي',
        variant: 'destructive'
      });
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      toast({
        title: 'تم',
        description: 'تم حذف العنصر من المفضلة'
      });

      fetchFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حذف العنصر من المفضلة',
        variant: 'destructive'
      });
    }
  };

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">يجب تسجيل الدخول</h1>
            <p className="text-muted-foreground">يجب تسجيل الدخول لعرض الملف الشخصي</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 px-4">
      <div className="container mx-auto py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <Avatar className="w-24 h-24 lg:w-32 lg:h-32 mx-auto lg:mx-0">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'م'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center lg:text-right">
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">الاسم الكامل</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                          placeholder="اكتب اسمك الكامل"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">اسم المستخدم</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          placeholder="اكتب اسم المستخدم"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="avatar_url">رابط الصورة الشخصية</Label>
                      <Input
                        id="avatar_url"
                        value={formData.avatar_url}
                        onChange={(e) => setFormData({...formData, avatar_url: e.target.value})}
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <div className="flex gap-2 justify-center lg:justify-start">
                      <Button onClick={updateProfile} size="sm">
                        <Save className="h-4 w-4 ml-1" />
                        حفظ
                      </Button>
                      <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                        <X className="h-4 w-4 ml-1" />
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl lg:text-3xl font-bold mb-2">
                      {profile?.full_name || profile?.username || 'مستخدم'}
                    </h1>
                    {profile?.username && profile?.full_name && (
                      <p className="text-muted-foreground mb-2">@{profile.username}</p>
                    )}
                    <p className="text-sm text-muted-foreground mb-4">{user.email}</p>
                    <div className="flex gap-2 justify-center lg:justify-start">
                      <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 ml-1" />
                        تعديل الملف الشخصي
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 lg:gap-4 lg:flex-col text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{favorites.length}</div>
                  <div className="text-sm text-muted-foreground">المفضلة</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">{watchHistory.length}</div>
                  <div className="text-sm text-muted-foreground">تمت مشاهدته</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="favorites" className="space-y-6">
          <TabsList className="bg-background-secondary w-full lg:w-auto">
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="h-4 w-4" />
              المفضلة ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              سجل المشاهدة ({watchHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            {favorites.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
                {favorites.map((favorite) => (
                  <div key={favorite.id} className="relative group">
                     <ContentCard
                        id={favorite.content.id}
                        title={favorite.content.title}
                        posterUrl={favorite.content.poster_url}
                        rating={favorite.content.rating}
                        year={favorite.content.release_date ? new Date(favorite.content.release_date).getFullYear() : undefined}
                        type={favorite.content.content_type as 'movie' | 'series' | 'anime'}
                        categories={favorite.content.categories}
                        onClick={() => window.location.href = `/content/${favorite.content.id}`}
                      />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFavorite(favorite.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد عناصر في المفضلة</h3>
                  <p className="text-muted-foreground">
                    ابدأ بإضافة الأفلام والمسلسلات المفضلة لديك
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            {watchHistory.length > 0 ? (
              <div className="space-y-4">
                {watchHistory.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {(item.content?.poster_url || item.episode?.season?.content?.poster_url) && (
                          <img
                            src={item.content?.poster_url || item.episode?.season?.content?.poster_url}
                            alt={item.content?.title || item.episode?.season?.content?.title}
                            className="w-16 h-24 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">
                            {item.content?.title || item.episode?.season?.content?.title}
                          </h3>
                          
                          {item.episode && (
                            <p className="text-sm text-muted-foreground mb-2">
                              الموسم {item.episode.season?.season_number} - الحلقة {item.episode.episode_number}
                              {item.episode.title && `: ${item.episode.title}`}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>وقت المشاهدة: {formatWatchTime(item.watch_time)}</span>
                            <span>آخر مشاهدة: {new Date(item.last_watched).toLocaleDateString('ar')}</span>
                            {item.completed && (
                              <span className="text-green-600">مكتمل</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">سجل المشاهدة فارغ</h3>
                  <p className="text-muted-foreground">
                    ابدأ بمشاهدة الأفلام والمسلسلات لتظهر هنا
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}