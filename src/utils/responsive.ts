// Responsive utilities and breakpoint helpers

export const breakpoints = {
  xs: '(min-width: 475px)',
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
  // Custom breakpoints
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
  // Video player specific
  videoSmall: '(max-width: 639px)',
  videoMedium: '(min-width: 640px) and (max-width: 1023px)',
  videoLarge: '(min-width: 1024px)',
} as const;

// Hook for media queries
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    
    const updateMatches = () => setMatches(media.matches);
    
    // Set initial value
    updateMatches();
    
    // Listen for changes
    media.addEventListener('change', updateMatches);
    
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
};

// Responsive breakpoint hooks
export const useBreakpoint = () => {
  const isMobile = useMediaQuery(breakpoints.mobile);
  const isTablet = useMediaQuery(breakpoints.tablet);
  const isDesktop = useMediaQuery(breakpoints.desktop);
  const isSmall = useMediaQuery(breakpoints.sm);
  const isMedium = useMediaQuery(breakpoints.md);
  const isLarge = useMediaQuery(breakpoints.lg);
  const isXLarge = useMediaQuery(breakpoints.xl);
  const is2XLarge = useMediaQuery(breakpoints['2xl']);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSmall,
    isMedium,
    isLarge,
    isXLarge,
    is2XLarge,
    // Derived states
    isTouch: isMobile || isTablet,
    isSmallScreen: isMobile,
    isMediumScreen: isTablet || isMedium,
    isLargeScreen: isDesktop && isLarge,
    isExtraLargeScreen: isXLarge || is2XLarge,
  };
};

// Responsive grid configurations
export const getResponsiveGrid = (type: 'content' | 'episodes' | 'categories' | 'hero') => {
  const configs = {
    content: {
      mobile: 'grid-cols-2',
      tablet: 'sm:grid-cols-3 md:grid-cols-4',
      desktop: 'lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
    },
    episodes: {
      mobile: 'grid-cols-1',
      tablet: 'sm:grid-cols-2',
      desktop: 'lg:grid-cols-3 xl:grid-cols-4',
    },
    categories: {
      mobile: 'grid-cols-2',
      tablet: 'sm:grid-cols-3',
      desktop: 'lg:grid-cols-4 xl:grid-cols-5',
    },
    hero: {
      mobile: 'grid-cols-1',
      tablet: 'sm:grid-cols-1',
      desktop: 'lg:grid-cols-2',
    },
  };

  const config = configs[type];
  return `${config.mobile} ${config.tablet} ${config.desktop}`;
};

// Responsive spacing
export const getResponsiveSpacing = (type: 'container' | 'section' | 'card' | 'text') => {
  const spacings = {
    container: {
      padding: 'px-4 sm:px-6 lg:px-8',
      margin: 'mx-auto',
      maxWidth: 'max-w-7xl',
    },
    section: {
      padding: 'py-8 sm:py-12 lg:py-16',
      margin: 'my-4 sm:my-6 lg:my-8',
    },
    card: {
      padding: 'p-4 sm:p-6',
      margin: 'm-2 sm:m-3 lg:m-4',
      gap: 'gap-3 sm:gap-4 lg:gap-6',
    },
    text: {
      size: 'text-sm sm:text-base lg:text-lg',
      heading: 'text-lg sm:text-xl lg:text-2xl xl:text-3xl',
      title: 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl',
    },
  };

  return spacings[type];
};

// Responsive video player settings
export const getVideoPlayerConfig = () => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  return {
    controls: {
      size: isMobile ? 'sm' : isTablet ? 'md' : 'lg',
      spacing: isMobile ? 'gap-2' : 'gap-4',
      fontSize: isMobile ? 'text-xs' : 'text-sm',
    },
    aspectRatio: {
      className: isMobile ? 'aspect-video' : 'aspect-video',
      height: isMobile ? 'h-48' : isTablet ? 'h-64' : 'h-96',
    },
    quality: {
      default: isMobile ? '480p' : isTablet ? '720p' : '1080p',
      options: isMobile 
        ? ['360p', '480p', '720p'] 
        : isTablet 
        ? ['480p', '720p', '1080p'] 
        : ['720p', '1080p', '4K'],
    },
  };
};

// Performance optimization utilities
export const optimizeImages = (url?: string, options?: {
  width?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}) => {
  if (!url) return '';

  // If it's already optimized or external URL, return as is
  if (url.includes('?') || url.startsWith('http')) {
    return url;
  }

  const { width, quality = 80, format = 'webp' } = options || {};
  
  // Add optimization parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  params.append('q', quality.toString());
  params.append('f', format);

  return `${url}?${params.toString()}`;
};

// Responsive image sizes for different use cases
export const getImageSizes = (type: 'poster' | 'backdrop' | 'thumbnail' | 'avatar') => {
  const sizes = {
    poster: {
      mobile: { width: 150, height: 225 },
      tablet: { width: 200, height: 300 },
      desktop: { width: 300, height: 450 },
    },
    backdrop: {
      mobile: { width: 640, height: 360 },
      tablet: { width: 1024, height: 576 },
      desktop: { width: 1920, height: 1080 },
    },
    thumbnail: {
      mobile: { width: 320, height: 180 },
      tablet: { width: 480, height: 270 },
      desktop: { width: 640, height: 360 },
    },
    avatar: {
      mobile: { width: 40, height: 40 },
      tablet: { width: 48, height: 48 },
      desktop: { width: 56, height: 56 },
    },
  };

  return sizes[type];
};

// Lazy loading configuration
export const getLazyLoadingConfig = () => {
  const { isMobile } = useBreakpoint();

  return {
    // Load images when they're closer to viewport on mobile
    rootMargin: isMobile ? '50px' : '100px',
    threshold: 0.1,
    // Reduce initial load on mobile
    itemsPerPage: isMobile ? 10 : 20,
  };
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void | Promise<void>) => {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
    });
  } else {
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
};

// Debounce utility for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Touch/gesture detection
export const useTouchGestures = () => {
  const { isTouch } = useBreakpoint();
  
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

    const isLeftSwipe = distance.x > 50;
    const isRightSwipe = distance.x < -50;
    const isUpSwipe = distance.y > 50;
    const isDownSwipe = distance.y < -50;

    return {
      isLeftSwipe,
      isRightSwipe,
      isUpSwipe,
      isDownSwipe,
      distance,
    };
  };

  return {
    isTouch,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};

// Responsive font sizes
export const getResponsiveFontSize = (type: 'display' | 'heading' | 'body' | 'caption') => {
  const sizes = {
    display: 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl',
    heading: 'text-2xl sm:text-3xl lg:text-4xl',
    body: 'text-sm sm:text-base',
    caption: 'text-xs sm:text-sm',
  };

  return sizes[type];
};

// Viewport utilities
export const getViewportDimensions = () => {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  React.useEffect(() => {
    const handleResize = debounce(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return dimensions;
};

// Export React for hooks
import * as React from 'react';

export default {
  breakpoints,
  useMediaQuery,
  useBreakpoint,
  getResponsiveGrid,
  getResponsiveSpacing,
  getVideoPlayerConfig,
  optimizeImages,
  getImageSizes,
  getLazyLoadingConfig,
  measurePerformance,
  debounce,
  throttle,
  useTouchGestures,
  getResponsiveFontSize,
  getViewportDimensions,
};
