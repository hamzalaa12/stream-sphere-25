import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ContentItem {
  id: string;
  title: string;
  poster_url?: string;
  rating: number;
  content_type: 'movie' | 'series' | 'anime';
  categories?: string[];
  release_date?: string;
}

interface RelatedContentGridProps {
  content: ContentItem[];
  title?: string;
}

export const RelatedContentGrid: React.FC<RelatedContentGridProps> = ({
  content,
  title = "محتوى مشابه"
}) => {
  if (content.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">لا يوجد محتوى مشابه متاح حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {content.map((item) => (
          <Link key={item.id} to={`/content/${item.id}`}>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-0">
                <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg">
                  <img
                    src={item.poster_url || '/placeholder.svg'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.content_type === 'movie' ? 'فيلم' : 
                       item.content_type === 'series' ? 'مسلسل' : 'أنمي'}
                    </Badge>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-accent text-accent" />
                      <span className="text-xs text-muted-foreground">{item.rating}</span>
                    </div>
                    {item.release_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.release_date).getFullYear()}
                      </span>
                    )}
                  </div>
                  {item.categories && item.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.categories.slice(0, 2).map((category, index) => (
                        <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};