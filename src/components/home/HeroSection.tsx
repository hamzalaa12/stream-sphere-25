import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Plus, Star, Clock } from 'lucide-react';
import heroImage from '@/assets/hero-streaming.jpg';

export const HeroSection = () => {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
            مرحباً بك في 
            <span className="bg-gradient-primary bg-clip-text text-transparent"> StreamSphere</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-200 max-w-2xl mx-auto">
            استمتع بمشاهدة آلاف الأفلام والمسلسلات والأنمي بجودة عالية
          </p>

          {/* Features */}
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
              <Star className="h-3 w-3 ml-1" />
              أحدث الإصدارات
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
              <Play className="h-3 w-3 ml-1" />
              جودة 4K
            </Badge>
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20">
              <Clock className="h-3 w-3 ml-1" />
              متاح 24/7
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              variant="primary" 
              size="lg" 
              className="text-lg px-8 py-3 shadow-elevated"
            >
              <Play className="h-5 w-5 ml-2" />
              ابدأ المشاهدة الآن
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Plus className="h-5 w-5 ml-2" />
              إضافة للمفضلة
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  );
};