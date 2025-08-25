// Animation utilities and configurations for enhanced visual effects

export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  fadeInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  fadeInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  
  scaleInBounce: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: { 
      duration: 0.5, 
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  },

  // Slide animations
  slideInLeft: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  slideInRight: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  slideInUp: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  
  slideInDown: {
    initial: { y: "-100%" },
    animate: { y: 0 },
    exit: { y: "-100%" },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Rotation animations
  rotateIn: {
    initial: { opacity: 0, rotate: -180 },
    animate: { opacity: 1, rotate: 0 },
    exit: { opacity: 0, rotate: 180 },
    transition: { duration: 0.5, ease: "easeOut" }
  },

  // Flip animations
  flipIn: {
    initial: { opacity: 0, rotateY: -90 },
    animate: { opacity: 1, rotateY: 0 },
    exit: { opacity: 0, rotateY: 90 },
    transition: { duration: 0.5, ease: "easeOut" }
  },

  // Stagger children animation
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },

  staggerItem: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" }
  },

  // Hover animations
  hoverScale: {
    whileHover: { 
      scale: 1.05,
      transition: { duration: 0.2 }
    },
    whileTap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },
  
  hoverLift: {
    whileHover: { 
      y: -5,
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
      transition: { duration: 0.2 }
    }
  },
  
  hoverGlow: {
    whileHover: {
      boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
      transition: { duration: 0.2 }
    }
  },

  // Button animations
  buttonPress: {
    whileTap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },
  
  buttonHover: {
    whileHover: { 
      scale: 1.02,
      transition: { duration: 0.2 }
    },
    whileTap: { 
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },

  // Loading animations
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },
  
  spin: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }
    }
  },
  
  bounce: {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  },

  // Shake animation for errors
  shake: {
    animate: {
      x: [0, -10, 10, -10, 10, 0],
      transition: {
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  },

  // Page transition animations
  pageSlideLeft: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
    transition: { duration: 0.5, ease: "easeInOut" }
  },
  
  pageFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: "easeInOut" }
  },

  // Modal animations
  modalBackdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  modalContent: {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  // Card animations
  cardHover: {
    whileHover: {
      y: -8,
      scale: 1.02,
      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      transition: { duration: 0.3, ease: "easeOut" }
    }
  },
  
  cardPress: {
    whileTap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },

  // Parallax effect
  parallax: (offset: number) => ({
    y: offset * -0.5,
    transition: { type: "tween", ease: "easeOut" }
  }),

  // Text animations
  textReveal: {
    initial: { y: 100, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.8, ease: "easeOut" }
  },
  
  textSlideIn: {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { duration: 0.6, ease: "easeOut" }
  },

  // Hero section animations
  heroTitle: {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.8, delay: 0.2, ease: "easeOut" }
  },
  
  heroSubtitle: {
    initial: { y: 30, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.6, delay: 0.4, ease: "easeOut" }
  },
  
  heroButton: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.5, delay: 0.6, ease: "easeOut" }
  },

  // Notification animations
  notificationSlideIn: {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
    transition: { duration: 0.3, ease: "easeOut" }
  },

  // Image animations
  imageReveal: {
    initial: { scale: 1.1, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.8, ease: "easeOut" }
  },
  
  imagePulse: {
    whileHover: {
      scale: 1.05,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  },

  // Navigation animations
  navItemHover: {
    whileHover: {
      y: -2,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  },

  // Form animations
  formFieldFocus: {
    whileFocus: {
      scale: 1.02,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  },

  // Progress animations
  progressFill: (progress: number) => ({
    initial: { width: 0 },
    animate: { width: `${progress}%` },
    transition: { duration: 1, ease: "easeOut" }
  }),

  // Scroll-triggered animations
  scrollReveal: {
    initial: { y: 60, opacity: 0 },
    whileInView: { y: 0, opacity: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, ease: "easeOut" }
  },

  scrollScale: {
    initial: { scale: 0.8, opacity: 0 },
    whileInView: { scale: 1, opacity: 1 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

// Utility functions
export const createStaggeredAnimation = (delay: number = 0.1) => ({
  animate: {
    transition: {
      staggerChildren: delay,
      delayChildren: delay
    }
  }
});

export const createDelayedAnimation = (animation: any, delay: number) => ({
  ...animation,
  transition: {
    ...animation.transition,
    delay
  }
});

// Easing functions
export const easings = {
  easeInOut: "easeInOut",
  easeOut: "easeOut",
  easeIn: "easeIn",
  linear: "linear",
  spring: "spring",
  anticipate: "anticipate",
  backIn: "backIn",
  backOut: "backOut",
  backInOut: "backInOut",
  circIn: "circIn",
  circOut: "circOut",
  circInOut: "circInOut"
};

// Duration presets
export const durations = {
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  slowest: 1.2
};

// Common animation combinations
export const combineAnimations = (...animations: any[]) => {
  return animations.reduce((combined, animation) => ({
    ...combined,
    ...animation
  }), {});
};

export default animations;
