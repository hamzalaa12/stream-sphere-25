import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedComponentProps {
  children: React.ReactNode;
  animation?: string;
  delay?: number;
  duration?: number;
  triggerOnScroll?: boolean;
  threshold?: number;
  className?: string;
  once?: boolean;
  stagger?: boolean;
  staggerDelay?: number;
}

export const AnimatedComponent: React.FC<AnimatedComponentProps> = ({
  children,
  animation = 'animate-fade-in-up',
  delay = 0,
  duration,
  triggerOnScroll = false,
  threshold = 0.1,
  className,
  once = true,
  stagger = false,
  staggerDelay = 100
}) => {
  const [isVisible, setIsVisible] = useState(!triggerOnScroll);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerOnScroll) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated)) {
          setIsVisible(true);
          setHasAnimated(true);
        } else if (!once && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [triggerOnScroll, threshold, once, hasAnimated]);

  const animationClass = isVisible ? animation : '';
  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};
  const durationStyle = duration ? { animationDuration: `${duration}ms` } : {};

  const style = {
    ...delayStyle,
    ...durationStyle,
  };

  // Add stagger effect to children
  const childrenWithStagger = stagger
    ? React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            ...child.props,
            style: {
              ...child.props.style,
              animationDelay: `${delay + index * staggerDelay}ms`,
            },
            className: cn(child.props.className, animationClass),
          });
        }
        return child;
      })
    : children;

  return (
    <div
      ref={elementRef}
      className={cn(
        triggerOnScroll && !isVisible && 'opacity-0',
        !stagger && animationClass,
        className
      )}
      style={!stagger ? style : undefined}
    >
      {stagger ? childrenWithStagger : children}
    </div>
  );
};

// Specialized animation components
export const FadeIn: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-fade-in" />
);

export const FadeInUp: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-fade-in-up" />
);

export const FadeInDown: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-fade-in-down" />
);

export const FadeInLeft: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-fade-in-left" />
);

export const FadeInRight: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-fade-in-right" />
);

export const ScaleIn: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-scale-in" />
);

export const ScaleInBounce: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-scale-in-bounce" />
);

export const SlideInLeft: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-slide-in-left" />
);

export const SlideInRight: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-slide-in-right" />
);

export const SlideInUp: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-slide-in-up" />
);

export const SlideInDown: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-slide-in-down" />
);

export const RotateIn: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-rotate-in" />
);

export const FlipIn: React.FC<Omit<AnimatedComponentProps, 'animation'>> = (props) => (
  <AnimatedComponent {...props} animation="animate-flip-in" />
);

// Container for staggered animations
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  animation?: string;
  className?: string;
  triggerOnScroll?: boolean;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 100,
  animation = 'animate-fade-in-up',
  className,
  triggerOnScroll = true,
}) => {
  return (
    <AnimatedComponent
      animation=""
      triggerOnScroll={triggerOnScroll}
      stagger={true}
      staggerDelay={staggerDelay}
      className={className}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return (
            <div
              key={index}
              className={animation}
              style={{ animationDelay: `${index * staggerDelay}ms` }}
            >
              {child}
            </div>
          );
        }
        return child;
      })}
    </AnimatedComponent>
  );
};

// Hover animation wrapper
interface HoverAnimationProps {
  children: React.ReactNode;
  hoverClass?: string;
  className?: string;
}

export const HoverAnimation: React.FC<HoverAnimationProps> = ({
  children,
  hoverClass = 'hover-lift',
  className,
}) => {
  return (
    <div className={cn(hoverClass, className)}>
      {children}
    </div>
  );
};

// Loading animation component
interface LoadingAnimationProps {
  type?: 'pulse' | 'spin' | 'bounce' | 'shimmer' | 'dots';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
  type = 'pulse',
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    spin: 'animate-spin',
    bounce: 'animate-bounce',
    shimmer: 'animate-shimmer',
    dots: 'loading-dots',
  };

  if (type === 'dots') {
    return (
      <span className={cn('loading-dots', className)}>
        جاري التحميل
      </span>
    );
  }

  if (type === 'shimmer') {
    return (
      <div className={cn('h-4 bg-muted rounded animate-shimmer', className)} />
    );
  }

  return (
    <div
      className={cn(
        'border-2 border-muted rounded-full',
        sizeClasses[size],
        animationClasses[type],
        type === 'spin' && 'border-t-primary',
        className
      )}
    />
  );
};

// Progress animation component
interface ProgressAnimationProps {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

export const ProgressAnimation: React.FC<ProgressAnimationProps> = ({
  progress,
  className,
  showPercentage = false,
  animated = true,
}) => {
  return (
    <div className={cn('relative', className)}>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            'h-2 bg-primary rounded-full transition-all duration-700 ease-out',
            animated && 'animate-progress-fill'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <span className="absolute top-0 right-0 text-xs text-muted-foreground">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

// Typewriter animation component
interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  cursor?: boolean;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 50,
  className,
  cursor = true,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (displayText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, displayText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [displayText, text, speed]);

  return (
    <span className={cn('inline-block', className)}>
      {displayText}
      {cursor && (
        <span
          className={cn(
            'inline-block w-0.5 bg-primary ml-1',
            isComplete ? 'animate-pulse' : ''
          )}
        >
          |
        </span>
      )}
    </span>
  );
};

// Reveal on scroll hook
export const useScrollReveal = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold]);

  return [elementRef, isVisible] as const;
};

// Parallax component
interface ParallaxProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
}

export const Parallax: React.FC<ParallaxProps> = ({
  children,
  speed = 0.5,
  className,
}) => {
  const [offsetY, setOffsetY] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * speed;
        setOffsetY(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        transform: `translateY(${offsetY}px)`,
      }}
    >
      {children}
    </div>
  );
};

export default AnimatedComponent;
