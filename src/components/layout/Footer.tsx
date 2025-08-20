import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-background-tertiary text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                StreamSphere
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              منصتك المفضلة لمشاهدة آلاف الأفلام والمسلسلات والأنمي بجودة عالية. 
              استمتع بتجربة مشاهدة لا تُنسى مع أحدث المحتويات والإصدارات الحصرية.
            </p>
            <div className="flex space-x-2 space-x-reverse">
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">روابط سريعة</h3>
            <div className="space-y-2">
              <Link to="/movies" className="block text-muted-foreground hover:text-primary transition-smooth">
                الأفلام
              </Link>
              <Link to="/series" className="block text-muted-foreground hover:text-primary transition-smooth">
                المسلسلات
              </Link>
              <Link to="/anime" className="block text-muted-foreground hover:text-primary transition-smooth">
                الأنمي
              </Link>
              <Link to="/top-rated" className="block text-muted-foreground hover:text-primary transition-smooth">
                الأعلى تقييماً
              </Link>
              <Link to="/latest" className="block text-muted-foreground hover:text-primary transition-smooth">
                أحدث الإصدارات
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">التصنيفات</h3>
            <div className="space-y-2">
              <Link to="/genre/action" className="block text-muted-foreground hover:text-primary transition-smooth">
                أكشن
              </Link>
              <Link to="/genre/drama" className="block text-muted-foreground hover:text-primary transition-smooth">
                دراما
              </Link>
              <Link to="/genre/comedy" className="block text-muted-foreground hover:text-primary transition-smooth">
                كوميدي
              </Link>
              <Link to="/genre/romance" className="block text-muted-foreground hover:text-primary transition-smooth">
                رومانسي
              </Link>
              <Link to="/genre/thriller" className="block text-muted-foreground hover:text-primary transition-smooth">
                إثارة
              </Link>
            </div>
          </div>

          {/* Contact & Support */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg">الدعم والتواصل</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm">support@streamsphere.com</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-muted-foreground">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm">+966 12 345 6789</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm">المملكة العربية السعودية</span>
              </div>
            </div>
            <div className="space-y-2">
              <Link to="/help" className="block text-muted-foreground hover:text-primary transition-smooth text-sm">
                مركز المساعدة
              </Link>
              <Link to="/contact" className="block text-muted-foreground hover:text-primary transition-smooth text-sm">
                تواصل معنا
              </Link>
              <Link to="/privacy" className="block text-muted-foreground hover:text-primary transition-smooth text-sm">
                سياسة الخصوصية
              </Link>
              <Link to="/terms" className="block text-muted-foreground hover:text-primary transition-smooth text-sm">
                شروط الاستخدام
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-muted-foreground text-sm">
              © 2024 StreamSphere. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
              <span>متاح على:</span>
              <div className="flex space-x-2 space-x-reverse">
                <span className="px-2 py-1 bg-secondary rounded text-xs">الويب</span>
                <span className="px-2 py-1 bg-secondary rounded text-xs">الجوال</span>
                <span className="px-2 py-1 bg-secondary rounded text-xs">التابلت</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};