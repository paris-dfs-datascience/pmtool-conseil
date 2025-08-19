import { useEffect, useRef } from 'react';

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
  }
}

export const useEssentialTracking = () => {
  const pageStartTime = useRef<number>(Date.now());
  const maxScrollDepth = useRef<number>(0);
  const scrollThresholds = useRef<Set<number>>(new Set());

  // 1. PAGE VIEW TRACKING
  const trackPageView = (path?: string, title?: string) => {
    const currentPath = path || window.location.pathname;
    const currentTitle = title || document.title;

    if (window.gtag) {
      // Update Google Analytics with new page
      window.gtag('config', 'G-EN1K9X096N', {
        page_path: currentPath,
        page_title: currentTitle
      });

      // Send page view event
      window.gtag('event', 'page_view', {
        page_title: currentTitle,
        page_location: window.location.href,
        page_path: currentPath
      });

      console.log(`Page view tracked: ${currentPath}`);
    }

    // Reset tracking state for new page
    pageStartTime.current = Date.now();
    maxScrollDepth.current = 0;
    scrollThresholds.current.clear();
  };

  // 2. CLICK TRACKING
  const trackClick = (elementName: string, elementType?: string, additionalData?: any) => {
    if (window.gtag) {
      window.gtag('event', 'click', {
        event_category: 'User Interaction',
        event_label: elementName,
        element_type: elementType || 'button',
        click_timestamp: Date.now(),
        ...additionalData
      });

      console.log(`Click tracked: ${elementName}`);
    }
  };

  // 3. TIME ON PAGE TRACKING
  const trackTimeOnPage = () => {
    const timeSpent = Math.round((Date.now() - pageStartTime.current) / 1000);
    
    if (window.gtag && timeSpent > 0) {
      window.gtag('event', 'timing_complete', {
        name: 'time_on_page',
        value: timeSpent
      });

      window.gtag('event', 'page_engagement', {
        event_category: 'Engagement',
        event_label: 'Time on Page',
        value: timeSpent,
        time_spent_seconds: timeSpent,
        max_scroll_depth: maxScrollDepth.current
      });

      console.log(`Time on page tracked: ${timeSpent} seconds`);
    }

    return timeSpent;
  };

  // 4. SCROLL DEPTH TRACKING
  const trackScrollDepth = () => {
    const scrollTop = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

    // Update max scroll depth
    if (scrollPercent > maxScrollDepth.current) {
      maxScrollDepth.current = Math.min(scrollPercent, 100);
    }

    // Track milestone percentages
    const milestones = [10, 25, 50, 75, 90, 100];
    
    milestones.forEach(milestone => {
      if (scrollPercent >= milestone && !scrollThresholds.current.has(milestone)) {
        scrollThresholds.current.add(milestone);
        
        if (window.gtag) {
          window.gtag('event', 'scroll', {
            event_category: 'Engagement',
            event_label: `${milestone}%`,
            value: milestone,
            scroll_depth: milestone
          });

          console.log(`Scroll depth tracked: ${milestone}%`);
        }
      }
    });
  };

  // Set up scroll tracking
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollDepth, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // Track time on page when component unmounts or page changes
  useEffect(() => {
    const handleBeforeUnload = () => {
      trackTimeOnPage();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackTimeOnPage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      trackTimeOnPage();
    };
  }, []);

  return {
    trackPageView,
    trackClick,
    trackTimeOnPage,
    trackScrollDepth
  };
};