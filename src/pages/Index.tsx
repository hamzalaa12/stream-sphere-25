import { Navbar } from '@/components/navigation/Navbar';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedContent } from '@/components/home/FeaturedContent';
import { Footer } from '@/components/layout/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturedContent />
      </main>
      <Footer />
    </div>
  );
};

export default Index;