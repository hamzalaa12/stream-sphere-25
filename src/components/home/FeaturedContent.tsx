import { ContentSection } from '@/components/content/ContentSection';
import { ContentCard } from '@/components/content/ContentCard';

// Mock data - in a real app, this would come from your API
const mockMovies = [
  {
    id: '1',
    title: 'فيلم الأكشن المثير',
    type: 'movie' as const,
    rating: 8.5,
    year: 2024,
    categories: ['أكشن', 'إثارة'],
    viewCount: 125000,
  },
  {
    id: '2',
    title: 'المغامرة الكبيرة',
    type: 'movie' as const,
    rating: 7.8,
    year: 2024,
    categories: ['مغامرة', 'دراما'],
    viewCount: 98000,
  },
];

const mockSeries = [
  {
    id: '3',
    title: 'مسلسل الجريمة',
    type: 'series' as const,
    rating: 9.2,
    year: 2024,
    categories: ['جريمة', 'غموض'],
    viewCount: 250000,
  },
  {
    id: '4',
    title: 'الرومانسية الكورية',
    type: 'series' as const,
    rating: 8.9,
    year: 2024,
    categories: ['رومانسية', 'درام'],
    viewCount: 180000,
  },
];

const mockAnime = [
  {
    id: '5',
    title: 'أنمي المغامرة',
    type: 'anime' as const,
    rating: 9.0,
    year: 2024,
    categories: ['مغامرة', 'شونين'],
    viewCount: 320000,
  },
  {
    id: '6',
    title: 'أنمي الرومانسية',
    type: 'anime' as const,
    rating: 8.7,
    year: 2024,
    categories: ['رومانسية', 'مدرسي'],
    viewCount: 210000,
  },
];

export const FeaturedContent = () => {
  return (
    <div className="bg-background-secondary">
      {/* Latest Movies */}
      <ContentSection 
        title="أحدث الأفلام" 
        showViewAll
        onViewAll={() => console.log('View all movies')}
      >
        {mockMovies.map((movie) => (
          <div key={movie.id} className="flex-none w-48">
            <ContentCard
              {...movie}
              onClick={() => console.log('Movie clicked:', movie.id)}
            />
          </div>
        ))}
        {/* Duplicate for scroll effect */}
        {mockMovies.map((movie) => (
          <div key={`${movie.id}-2`} className="flex-none w-48">
            <ContentCard
              {...movie}
              onClick={() => console.log('Movie clicked:', movie.id)}
            />
          </div>
        ))}
      </ContentSection>

      {/* Latest Series */}
      <ContentSection 
        title="أحدث المسلسلات" 
        showViewAll
        onViewAll={() => console.log('View all series')}
      >
        {mockSeries.map((series) => (
          <div key={series.id} className="flex-none w-48">
            <ContentCard
              {...series}
              onClick={() => console.log('Series clicked:', series.id)}
            />
          </div>
        ))}
        {mockSeries.map((series) => (
          <div key={`${series.id}-2`} className="flex-none w-48">
            <ContentCard
              {...series}
              onClick={() => console.log('Series clicked:', series.id)}
            />
          </div>
        ))}
      </ContentSection>

      {/* Latest Episodes */}
      <ContentSection 
        title="أحدث الحلقات" 
        showViewAll
        onViewAll={() => console.log('View all episodes')}
      >
        {[...mockSeries, ...mockAnime].map((content) => (
          <div key={content.id} className="flex-none w-48">
            <ContentCard
              {...content}
              onClick={() => console.log('Episode clicked:', content.id)}
            />
          </div>
        ))}
      </ContentSection>

      {/* Latest Anime */}
      <ContentSection 
        title="أحدث الأنمي" 
        showViewAll
        onViewAll={() => console.log('View all anime')}
      >
        {mockAnime.map((anime) => (
          <div key={anime.id} className="flex-none w-48">
            <ContentCard
              {...anime}
              onClick={() => console.log('Anime clicked:', anime.id)}
            />
          </div>
        ))}
        {mockAnime.map((anime) => (
          <div key={`${anime.id}-2`} className="flex-none w-48">
            <ContentCard
              {...anime}
              onClick={() => console.log('Anime clicked:', anime.id)}
            />
          </div>
        ))}
      </ContentSection>

      {/* Top Rated */}
      <ContentSection 
        title="الأعلى تقييماً" 
        showViewAll
        onViewAll={() => console.log('View all top rated')}
      >
        {[...mockMovies, ...mockSeries, ...mockAnime]
          .sort((a, b) => b.rating - a.rating)
          .map((content) => (
            <div key={content.id} className="flex-none w-48">
              <ContentCard
                {...content}
                onClick={() => console.log('Top rated clicked:', content.id)}
              />
            </div>
          ))
        }
      </ContentSection>
    </div>
  );
};