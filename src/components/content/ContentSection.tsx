import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ContentSectionProps {
  title: string;
  children: ReactNode;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export const ContentSection = ({
  title,
  children,
  showViewAll = false,
  onViewAll,
  className = '',
}: ContentSectionProps) => {
  return (
    <section className={`py-8 ${className}`}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {showViewAll && (
            <Button 
              variant="outline" 
              onClick={onViewAll}
              className="flex items-center space-x-2 space-x-reverse"
            >
              <span>عرض الكل</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="relative">
          <div className="flex space-x-4 space-x-reverse overflow-x-auto scrollbar-hide pb-4">
            {children}
          </div>
          
          {/* Gradient Fade Effects */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};