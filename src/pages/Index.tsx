import { Navbar } from '@/components/navigation/Navbar';
import { EnhancedHeroSection } from '@/components/home/EnhancedHeroSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { RecommendationsSection } from '@/components/home/RecommendationsSection';
import { FeaturedContent } from '@/components/home/FeaturedContent';
import { Footer } from '@/components/layout/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="space-y-0">
        {/* Epic Hero Section with Dynamic Content */}
        <EnhancedHeroSection />

        {/* Trending Content with Time Filters */}
        <TrendingSection />

        {/* Interactive Category Showcase */}
        <CategoryShowcase />

        {/* New Releases Carousel */}
        <NewReleasesSection />

        {/* Personalized Recommendations */}
        <RecommendationsSection />

        {/* Enhanced Featured Content */}
        <FeaturedContent />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
