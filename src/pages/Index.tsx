import { Navbar } from '@/components/navigation/Navbar';
import { EnhancedHeroSection } from '@/components/home/EnhancedHeroSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { RecommendationsSection } from '@/components/home/RecommendationsSection';
import { FeaturedContent } from '@/components/home/FeaturedContent';
import { Footer } from '@/components/layout/Footer';
import { FadeInUp, StaggerContainer } from '@/components/ui/animated-component';

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Navbar />
      <main className="space-y-0">
        {/* Epic Hero Section with Dynamic Content */}
        <div className="hero-section">
          <EnhancedHeroSection />
        </div>

        {/* Animated Sections Container */}
        <StaggerContainer staggerDelay={200} className="space-y-0">
          {/* Trending Content with Time Filters */}
          <FadeInUp triggerOnScroll className="section-container">
            <TrendingSection />
          </FadeInUp>

          {/* Interactive Category Showcase */}
          <FadeInUp triggerOnScroll delay={100} className="section-container">
            <CategoryShowcase />
          </FadeInUp>

          {/* New Releases Carousel */}
          <FadeInUp triggerOnScroll delay={200} className="section-container">
            <NewReleasesSection />
          </FadeInUp>

          {/* Personalized Recommendations */}
          <FadeInUp triggerOnScroll delay={300} className="section-container">
            <RecommendationsSection />
          </FadeInUp>

          {/* Enhanced Featured Content */}
          <FadeInUp triggerOnScroll delay={400} className="section-container">
            <FeaturedContent />
          </FadeInUp>
        </StaggerContainer>
      </main>

      {/* Animated Footer */}
      <FadeInUp triggerOnScroll className="footer-container">
        <Footer />
      </FadeInUp>
    </div>
  );
};

export default Index;
