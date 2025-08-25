import React from 'react';
import { cn } from '@/lib/utils';
import { useBreakpoint, getResponsiveSpacing, getResponsiveGrid } from '@/utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'main' | 'section' | 'article' | 'header' | 'footer';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = '7xl',
  padding = 'md',
  as: Component = 'div',
}) => {
  const containerSpacing = getResponsiveSpacing('container');
  
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '7xl': 'max-w-7xl',
  };

  const paddingClasses = {
    none: '',
    sm: 'px-2 sm:px-4',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-6 sm:px-8 lg:px-12',
  };

  return (
    <Component
      className={cn(
        containerSpacing.margin,
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </Component>
  );
};

interface ResponsiveGridProps {
  children: React.ReactNode;
  type: 'content' | 'episodes' | 'categories' | 'hero';
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  type,
  className,
  gap = 'md',
}) => {
  const gridClasses = getResponsiveGrid(type);
  
  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  return (
    <div className={cn('grid', gridClasses, gapClasses[gap], className)}>
      {children}
    </div>
  );
};

interface ResponsiveTextProps {
  children: React.ReactNode;
  type: 'display' | 'heading' | 'body' | 'caption';
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  children,
  type,
  className,
  as: Component = 'p',
}) => {
  const { getResponsiveFontSize } = require('@/utils/responsive');
  const sizeClasses = getResponsiveFontSize(type);

  return (
    <Component className={cn(sizeClasses, className)}>
      {children}
    </Component>
  );
};

interface AdaptiveImageProps {
  src?: string;
  alt: string;
  type: 'poster' | 'backdrop' | 'thumbnail' | 'avatar';
  className?: string;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

export const AdaptiveImage: React.FC<AdaptiveImageProps> = ({
  src,
  alt,
  type,
  className,
  loading = 'lazy',
  sizes,
}) => {
  const { isMobile, isTablet } = useBreakpoint();
  const { optimizeImages, getImageSizes } = require('@/utils/responsive');
  
  if (!src) {
    return (
      <div className={cn('bg-muted flex items-center justify-center', className)}>
        <span className="text-muted-foreground text-sm">لا توجد صورة</span>
      </div>
    );
  }

  // Get appropriate size based on device
  const imageSizes = getImageSizes(type);
  const deviceSize = isMobile 
    ? imageSizes.mobile 
    : isTablet 
    ? imageSizes.tablet 
    : imageSizes.desktop;

  const optimizedSrc = optimizeImages(src, {
    width: deviceSize.width,
    quality: isMobile ? 70 : 80,
    format: 'webp',
  });

  const defaultSizes = sizes || 
    (type === 'backdrop' 
      ? '(max-width: 768px) 100vw, (max-width: 1024px) 75vw, 50vw'
      : type === 'poster'
      ? '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
      : '(max-width: 768px) 25vw, 20vw');

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      className={cn('transition-all duration-300', className)}
      loading={loading}
      sizes={defaultSizes}
      style={{
        aspectRatio: `${deviceSize.width} / ${deviceSize.height}`,
      }}
    />
  );
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed inset-y-0 right-0 w-64 bg-background border-l border-border z-50 lg:hidden animate-slide-in-right">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <button
              onClick={onClose}
              className="w-full flex items-center justify-end"
            >
              <span className="sr-only">إغلاق القائمة</span>
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

interface TouchGestureProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export const TouchGesture: React.FC<TouchGestureProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
}) => {
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = {
      x: touchStart.x - touchEnd.x,
      y: touchStart.y - touchEnd.y,
    };

    const isLeftSwipe = distance.x > threshold;
    const isRightSwipe = distance.x < -threshold;
    const isUpSwipe = distance.y > threshold;
    const isDownSwipe = distance.y < -threshold;

    if (isLeftSwipe && onSwipeLeft) onSwipeLeft();
    if (isRightSwipe && onSwipeRight) onSwipeRight();
    if (isUpSwipe && onSwipeUp) onSwipeUp();
    if (isDownSwipe && onSwipeDown) onSwipeDown();
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

interface LazyLoadProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  fallback?: React.ReactNode;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  children,
  className,
  threshold = 0.1,
  rootMargin = '50px',
  fallback,
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold, rootMargin, hasLoaded]);

  return (
    <div ref={elementRef} className={className}>
      {isVisible ? children : fallback || <div className="animate-pulse bg-muted rounded h-48" />}
    </div>
  );
};

// Performance monitoring component
interface PerformanceMonitorProps {
  name: string;
  children: React.ReactNode;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  name,
  children,
}) => {
  React.useEffect(() => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      console.log(`Component ${name} render time: ${end - start}ms`);
    };
  }, [name]);

  return <>{children}</>;
};

export default {
  ResponsiveContainer,
  ResponsiveGrid,
  ResponsiveText,
  AdaptiveImage,
  MobileMenu,
  TouchGesture,
  LazyLoad,
  PerformanceMonitor,
};
