import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Film,
  Tv,
  Play,
  Star,
  Search,
  User,
  LogOut,
  Heart,
  Settings,
  Shield
} from 'lucide-react';

export const Navbar = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const movieItems = [
    { title: 'أفلام أجنبية', href: '/category/foreign?type=movie', icon: Film },
    { title: 'أفلام أنمي', href: '/category/anime?type=movie', icon: Play },
    { title: 'أفلام آسيوية', href: '/category/asian?type=movie', icon: Film },
    { title: 'أفلام نتفلكس', href: '/category/foreign?type=movie&netflix=true', icon: Film },
    { title: 'سلسلة أفلام', href: '/search?type=movie', icon: Film },
    { title: 'الأعلى تقييماً', href: '/category/foreign?type=movie&top=true', icon: Star },
  ];

  const foreignSeriesItems = [
    { title: 'قائمة المسلسلات', href: '/category/foreign?type=series', icon: Tv },
    { title: 'مسلسلات نتفلكس', href: '/category/foreign?type=series&netflix=true', icon: Tv },
    { title: 'الأعلى تقييماً', href: '/category/foreign?type=series&top=true', icon: Star },
  ];

  const asianSeriesItems = [
    { title: 'قائمة المسلسلات', href: '/category/asian?type=series', icon: Tv },
    { title: 'مسلسلات نتفلكس', href: '/category/asian?type=series&netflix=true', icon: Tv },
    { title: 'الأعلى تقييماً', href: '/category/asian?type=series&top=true', icon: Star },
  ];

  const animeItems = [
    { title: 'أحدث الحلقات', href: '/search?type=anime', icon: Play },
    { title: 'قائمة الأنميات', href: '/category/anime', icon: Play },
    { title: 'أنمي نتفلكس', href: '/category/anime?netflix=true', icon: Play },
    { title: 'الأعلى تقييماً', href: '/category/anime?top=true', icon: Star },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 space-x-reverse">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Play className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                StreamSphere
              </span>
            </Link>

            {/* Navigation Menu */}
            <NavigationMenu>
              <NavigationMenuList className="flex space-x-6 space-x-reverse">
                {/* Movies */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-foreground hover:text-primary transition-smooth">
                    أفلام
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-2 p-4 w-96">
                      {movieItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary transition-smooth"
                        >
                          <item.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Foreign Series */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-foreground hover:text-primary transition-smooth">
                    مسلسلات أجنبية
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-1 gap-2 p-4 w-64">
                      {foreignSeriesItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary transition-smooth"
                        >
                          <item.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Asian Series */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-foreground hover:text-primary transition-smooth">
                    مسلسلات آسيوية
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-1 gap-2 p-4 w-64">
                      {asianSeriesItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary transition-smooth"
                        >
                          <item.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Anime */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-foreground hover:text-primary transition-smooth">
                    أنمي
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid grid-cols-2 gap-2 p-4 w-80">
                      {animeItems.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className="flex items-center space-x-2 space-x-reverse p-3 rounded-lg hover:bg-secondary transition-smooth"
                        >
                          <item.icon className="h-4 w-4 text-primary" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4 space-x-reverse">
              {/* Search */}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/search">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>

              {/* Admin Button */}
              {isAdmin && (
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground" asChild>
                  <Link to="/admin">
                    <Shield className="h-5 w-5 ml-1" />
                    لوحة الإدارة
                  </Link>
                </Button>
              )}

              {/* User Actions */}
              {user ? (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/profile">
                      <Heart className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/profile">
                      <User className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/settings">
                      <Settings className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                >
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </>
  );
};
