import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Plus, Share2, Star, Calendar, Clock, Globe, Heart, BookmarkPlus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { EpisodeCard } from '@/components/content/EpisodeCard';
import { RelatedContentGrid } from '@/components/content/RelatedContentGrid';

interface ContentData {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  poster_url?: string;
  backdrop_url?: string;
  trailer_url?: string;
  rating: number;
  release_date?: string;
  duration?: number;
  content_type: 'movie' | 'series' | 'anime';
  categories: string[];
  language: string;
  country?: string;
  view_count: number;
  is_netflix: boolean;
  seasons?: Season[];
  streaming_links?: StreamingLink[];
}

interface Season {
  id: string;
  season_number: number;
  title?: string;
  episode_count: number;
  episodes?: Episode[];
}

interface Episode {
  id: string;
  episode_number: number;
  title?: string;
  description?: string;
  duration?: number;
  thumbnail_url?: string;
}

interface StreamingLink {
  id: string;
  streaming_url: string;
  server_name: string;
  quality: string;
}

interface Review {
  id: string;
  user_id: string;
  rating?: number;
  comment?: string;
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export default function ContentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<ContentData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (id) {
      fetchContentDetails(id);
      fetchReviews(id);
      checkIfFavorite(id);
    }
  }, [id, user]);

  const fetchContentDetails = async (contentId: string) => {
    try {
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .maybeSingle();

      if (contentError) throw contentError;
      if (!contentData) {
        throw new Error('Content not found');
      }

      let seasonsData = null;
      let streamingLinksData = null;

      if (contentData.content_type === 'series' || contentData.content_type === 'anime') {
        const { data: seasons } = await supabase
          .from('seasons')
          .select(`
            *,
            episodes (*)
          `)
          .eq('content_id', contentId)
          .order('season_number');
        seasonsData = seasons;
      } else {
        const { data: links } = await supabase
          .from('streaming_links')
          .select('*')
          .eq('content_id', contentId)
          .eq('is_active', true);
        streamingLinksData = links;
      }

      setContent({
        ...contentData,
        seasons: seasonsData,
        streaming_links: streamingLinksData
      });

      // Increment view count
      await supabase
        .from('content')
        .update({ view_count: (contentData.view_count || 0) + 1 })
        .eq('id', contentId);

    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل بيانات المحتوى',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkIfFavorite = async (contentId: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('content_id', contentId)
        .eq('user_id', user.id)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      // Not favorite
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة المحتوى للمفضلة'
      });
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('content_id', id)
          .eq('user_id', user.id);
        setIsFavorite(false);
        toast({ title: 'تم', description: 'تم حذف المحتوى من المفضلة' });
      } else {
        await supabase
          .from('favorites')
          .insert({ content_id: id, user_id: user.id });
        setIsFavorite(true);
        toast({ title: 'تم', description: 'تم إضافة المحتوى للمفضلة' });
      }
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المفضلة',
        variant: 'destructive'
      });
    }
  };

  const addReview = async () => {
    if (!user) {
      toast({
        title: 'مطلوب تسجيل الدخول',
        description: 'يجب تسجيل الدخول لإضافة تقييم'
      });
      return;
    }

    if (!newRating && !newComment.trim()) return;

    try {
      await supabase
        .from('reviews')
        .upsert({
          content_id: id,
          user_id: user.id,
          rating: newRating || null,
          comment: newComment.trim() || null
        });

      setNewRating(0);
      setNewComment('');
      fetchReviews(id!);
      toast({ title: 'تم', description: 'تم إضافة التقييم بنجاح' });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'فشل في إضافة التقييم',
        variant: 'destructive'
      });
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}س ${mins}د` : `${mins}د`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="container mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">المحتوى غير موجود</h1>
          <Link to="/">
            <Button>العودة للصفحة الرئيسية</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch related content
  const [relatedContent, setRelatedContent] = useState<ContentData[]>([]);

  const fetchRelatedContent = async (contentId: string) => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .neq('id', contentId)
        .in('categories', content?.categories || [])
        .limit(8);

      if (error) throw error;
      setRelatedContent(data || []);
    } catch (error) {
      console.error('Error fetching related content:', error);
    }
  };

  useEffect(() => {
    if (content && id) {
      fetchRelatedContent(id);
    }
  }, [content, id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-96 lg:h-[600px] overflow-hidden">
        {content.backdrop_url && (
          <img
            src={content.backdrop_url}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="container mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
              {content.poster_url && (
                <img
                  src={content.poster_url}
                  alt={content.title}
                  className="w-52 h-72 lg:w-64 lg:h-96 object-cover rounded-xl shadow-2xl mx-auto lg:mx-0 border-2 border-white/20"
                />
              )}
              
              <div className="flex-1 space-y-6">
                <div>
                  <h1 className="text-4xl lg:text-6xl font-bold mb-3 drop-shadow-lg">{content.title}</h1>
                  {content.title_en && (
                    <p className="text-xl lg:text-2xl text-muted-foreground opacity-90">{content.title_en}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                    <span className="font-bold text-white">{content.rating}/10</span>
                  </div>
                  {content.release_date && (
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                      <Calendar className="h-5 w-5 text-white" />
                      <span className="text-white">{new Date(content.release_date).getFullYear()}</span>
                    </div>
                  )}
                  {content.duration && (
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                      <Clock className="h-5 w-5 text-white" />
                      <span className="text-white">{formatDuration(content.duration)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                    <Eye className="h-5 w-5 text-white" />
                    <span className="text-white">{content.view_count.toLocaleString()} مشاهدة</span>
                  </div>
                  {content.language && (
                    <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                      <Globe className="h-5 w-5 text-white" />
                      <span className="text-white">{content.language}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  {content.categories?.map((category, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">{category}</Badge>
                  ))}
                  {content.is_netflix && (
                    <Badge className="bg-red-600 hover:bg-red-700 text-sm px-3 py-1">نتفليكس</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  {content.content_type === 'movie' ? (
                    <div className="flex gap-3">
                      <Link to={`/watch/${content.id}`}>
                        <Button size="lg" className="gap-3 text-lg px-8 py-3 bg-primary hover:bg-primary/90">
                          <Play className="h-6 w-6" />
                          شاهد الآن
                        </Button>
                      </Link>
                      {content.streaming_links?.find(link => link.download_url) && (
                        <Button size="lg" variant="outline" className="gap-3 text-lg px-8 py-3" asChild>
                          <a href={content.streaming_links.find(link => link.download_url)?.download_url} target="_blank" rel="noopener noreferrer">
                            <Plus className="h-6 w-6" />
                            حمل الآن
                          </a>
                        </Button>
                      )}
                    </div>
                  ) : (
                    content.seasons?.[0]?.episodes?.[0] && (
                      <div className="flex gap-3">
                        <Link to={`/watch/episode/${content.seasons[0].episodes[0].id}`}>
                          <Button size="lg" className="gap-3 text-lg px-8 py-3 bg-primary hover:bg-primary/90">
                            <Play className="h-6 w-6" />
                            شاهد الآن
                          </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="gap-3 text-lg px-8 py-3">
                          <Plus className="h-6 w-6" />
                          حمل الآن
                        </Button>
                      </div>
                    )
                  )}
                  
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={toggleFavorite}
                    className="gap-3 text-lg px-8 py-3"
                  >
                    <Heart className={`h-6 w-6 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    {isFavorite ? 'من المفضلة' : 'إضافة للمفضلة'}
                  </Button>
                  
                  {content.trailer_url && (
                    <Button size="lg" variant="ghost" className="gap-3 text-lg px-8 py-3">
                      <Play className="h-6 w-6" />
                      مشاهدة الإعلان
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="info" className="space-y-8">
          <TabsList className="bg-card border border-border p-1 h-12">
            <TabsTrigger value="info" className="px-6 py-2 text-base">معلومات</TabsTrigger>
            {(content.content_type === 'series' || content.content_type === 'anime') && (
              <TabsTrigger value="seasons" className="px-6 py-2 text-base">المواسم</TabsTrigger>
            )}
            {(content.content_type === 'series' || content.content_type === 'anime') && (
              <TabsTrigger value="episodes" className="px-6 py-2 text-base">الحلقات</TabsTrigger>
            )}
            <TabsTrigger value="related" className="px-6 py-2 text-base">محتوى مشابه</TabsTrigger>
            <TabsTrigger value="reviews" className="px-6 py-2 text-base">التقييمات</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">نبذة عن {content.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-8 text-lg">
                  {content.description || 'لا توجد معلومات متاحة حول هذا المحتوى.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {(content.content_type === 'series' || content.content_type === 'anime') && (
            <TabsContent value="seasons" className="space-y-6">
              {content.seasons && content.seasons.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {content.seasons.map((season) => (
                    <Card key={season.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold">الموسم {season.season_number}</h3>
                          {season.title && (
                            <p className="text-muted-foreground font-medium">{season.title}</p>
                          )}
                          <div className="text-sm text-muted-foreground">
                            عدد الحلقات: {season.episode_count}
                          </div>
                          <Button 
                            onClick={() => setSelectedSeason(season.season_number)}
                            className="w-full gap-2"
                            variant={selectedSeason === season.season_number ? 'default' : 'outline'}
                          >
                            <Play className="h-4 w-4" />
                            عرض الحلقات
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {(content.content_type === 'series' || content.content_type === 'anime') && (
            <TabsContent value="episodes" className="space-y-6">
              {content.seasons && content.seasons.length > 0 && (
                <div>
                  {content.seasons.length > 1 && (
                    <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
                      {content.seasons.map((season) => (
                        <Button
                          key={season.id}
                          variant={selectedSeason === season.season_number ? 'default' : 'outline'}
                          onClick={() => setSelectedSeason(season.season_number)}
                          className="whitespace-nowrap px-6 py-3 text-base"
                        >
                          الموسم {season.season_number}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-6">
                    {content.seasons
                      .find(s => s.season_number === selectedSeason)
                      ?.episodes?.map((episode, index) => (
                      <Card key={episode.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50 group">
                        <CardContent className="p-0">
                          <div className="flex gap-6 p-6">
                            {episode.thumbnail_url && (
                              <img
                                src={episode.thumbnail_url}
                                alt={episode.title}
                                className="w-40 h-24 object-cover rounded-lg border"
                              />
                            )}
                            <div className="flex-1 space-y-3">
                              <div className="flex justify-between items-start">
                                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                                  الحلقة {episode.episode_number}
                                  {episode.title && `: ${episode.title}`}
                                </h3>
                                {episode.duration && (
                                  <span className="text-muted-foreground font-medium">
                                    {formatDuration(episode.duration)}
                                  </span>
                                )}
                              </div>
                              {episode.description && (
                                <p className="text-muted-foreground leading-relaxed">
                                  {episode.description}
                                </p>
                              )}
                              <div className="flex gap-3 pt-2">
                                <Link to={`/watch/episode/${episode.id}`}>
                                  <Button className="gap-2">
                                    <Play className="h-4 w-4" />
                                    شاهد الآن
                                  </Button>
                                </Link>
                                <Button variant="outline" className="gap-2">
                                  <Plus className="h-4 w-4" />
                                  حمل الآن
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="related" className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-2xl">محتوى مشابه</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {relatedContent.map((item) => (
                    <Link key={item.id} to={`/content/${item.id}`}>
                      <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105">
                        <CardContent className="p-0">
                          <div className="aspect-[2/3] overflow-hidden rounded-t-lg">
                            <img
                              src={item.poster_url || '/placeholder.svg'}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-accent text-accent" />
                              <span className="text-xs text-muted-foreground">{item.rating}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {user && (
              <Card>
                <CardHeader>
                  <CardTitle>إضافة تقييم</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">التقييم:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewRating(star * 2)}
                          className="transition-smooth"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              star * 2 <= newRating
                                ? 'fill-accent text-accent'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({newRating}/10)
                    </span>
                  </div>
                  
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقك هنا..."
                    className="w-full h-24 px-3 py-2 bg-background-secondary border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  
                  <Button onClick={addReview} disabled={!newRating && !newComment.trim()}>
                    إضافة التقييم
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            م
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium">
                              مستخدم
                            </span>
                            {review.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-accent text-accent" />
                                <span className="text-sm">{review.rating}/10</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('ar')}
                            </span>
                          </div>
                          
                          {review.comment && (
                            <p className="text-muted-foreground">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}