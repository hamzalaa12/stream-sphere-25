import { Navbar } from '@/components/navigation/Navbar';
import { EnhancedHeroSection } from '@/components/home/EnhancedHeroSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { CategoryShowcase } from '@/components/home/CategoryShowcase';
import { NewReleasesSection } from '@/components/home/NewReleasesSection';
import { RecommendationsSection } from '@/components/home/RecommendationsSection';
import { FeaturedContent } from '@/components/home/FeaturedContent';
import { Footer } from '@/components/layout/Footer';
import { FadeInUp, StaggerContainer } from '@/components/ui/animated-component';
import { ResponsiveContainer, LazyLoad, PerformanceMonitor } from '@/components/ui/responsive-container';

const Index = () => {
  return (
    <PerformanceMonitor name="HomePage">
      <div className="min-h-screen bg-background overflow-hidden">
        <Navbar />
        <main className="space-y-0">
          {/* Epic Hero Section with Dynamic Content */}
          <div className="hero-section">
            <EnhancedHeroSection />
          </div>

          {/* Animated Sections Container with Responsive Layout */}
          <ResponsiveContainer padding="none" className="space-y-8 sm:space-y-12 lg:space-y-16">
            <StaggerContainer staggerDelay={200} className="space-y-8 sm:space-y-12 lg:space-y-16">
              {/* Trending Content with Time Filters */}
              <LazyLoad>
                <FadeInUp triggerOnScroll className="section-container">
                  <TrendingSection />
                </FadeInUp>
              </LazyLoad>

              {/* Interactive Category Showcase */}
              <LazyLoad>
                <FadeInUp triggerOnScroll delay={100} className="section-container">
                  <CategoryShowcase />
                </FadeInUp>
              </LazyLoad>

              {/* New Releases Carousel */}
              <LazyLoad>
                <FadeInUp triggerOnScroll delay={200} className="section-container">
                  <NewReleasesSection />
                </FadeInUp>
              </LazyLoad>

              {/* Personalized Recommendations */}
              <LazyLoad>
                <FadeInUp triggerOnScroll delay={300} className="section-container">
                  <RecommendationsSection />
                </FadeInUp>
              </LazyLoad>

              {/* Enhanced Featured Content */}
              <LazyLoad>
                <FadeInUp triggerOnScroll delay={400} className="section-container">
                  <FeaturedContent />
                </FadeInUp>
              </LazyLoad>
            </StaggerContainer>
          </ResponsiveContainer>
        </main>

        {/* Animated Footer */}
        <LazyLoad>
          <FadeInUp triggerOnScroll className="footer-container">
            <Footer />
          </FadeInUp>
        </LazyLoad>
      </div>
    </PerformanceMonitor>
  );
};

export default Index;
