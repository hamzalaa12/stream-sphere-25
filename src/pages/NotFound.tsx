import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-md mx-auto space-y-6">
          {/* 404 Visual */}
          <div className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            404
          </div>
          
          <h1 className="text-2xl font-bold text-foreground">
            الصفحة غير موجودة
          </h1>
          
          <p className="text-muted-foreground">
            عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild variant="primary">
              <Link to="/">
                <Home className="h-4 w-4 ml-2" />
                العودة إلى الرئيسية
              </Link>
            </Button>
            
            <Button asChild variant="outline">
              <Link to="/search">
                <Search className="h-4 w-4 ml-2" />
                البحث عن محتوى
              </Link>
            </Button>
          </div>
          
          {/* Suggestions */}
          <div className="text-sm text-muted-foreground">
            <p>يمكنك أيضاً:</p>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              <Link to="/movies" className="hover:text-primary transition-smooth">
                تصفح الأفلام
              </Link>
              <Link to="/series" className="hover:text-primary transition-smooth">
                تصفح المسلسلات
              </Link>
              <Link to="/anime" className="hover:text-primary transition-smooth">
                تصفح الأنمي
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;