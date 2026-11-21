'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * NavigationScrollManager
 * 
 * Ensures that whenever navigating between modules or routes:
 * 1. Both window scroll and any content containers instantly reset to scroll position (0, 0).
 * 2. Stale scroll positions from previously viewed modules are never carried over.
 * 3. Browser automatic scroll restoration is set to manual to prevent browser jumpiness.
 * 4. Multi-tick checks (immediate, rAF, 50ms, 150ms, 350ms) guarantee the active module
 *    remains firmly pinned to top 0 even after asynchronous API fetching, auto-refresh,
 *    and dynamic table/chart DOM expansion.
 */
export function NavigationScrollManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPathRef = useRef<string | null>(null);

  // Universal scroll reset function across all potential scroll contexts
  const resetAllScrolls = () => {
    if (typeof window === 'undefined') return;

    // 1. Reset standard window scroll
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
    } catch {
      window.scrollTo(0, 0);
    }

    // 2. Reset document root elements
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
    }

    // 3. Reset any inner dashboard main or scrollable content containers
    try {
      const scrollContainers = document.querySelectorAll<HTMLElement>(
        'main, [data-scroll-container], [role="main"], .overflow-y-auto, .overflow-auto'
      );
      scrollContainers.forEach((el) => {
        // Never reset the sidebar navigation itself if user was scrolling the menu
        if (!el.closest('aside')) {
          el.scrollTop = 0;
        }
      });
    } catch {}
  };

  // Enforce manual scroll restoration globally and listen for custom reset events
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const handleCustomReset = () => {
      resetAllScrolls();
    };

    const handlePopState = () => {
      resetAllScrolls();
      setTimeout(resetAllScrolls, 50);
    };

    window.addEventListener('app:reset-scroll', handleCustomReset);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('app:reset-scroll', handleCustomReset);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Multi-stage scroll reset triggered whenever route or query params change
  useEffect(() => {
    const currentPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    
    // Always execute reset
    resetAllScrolls();

    // Stage 1: Animation frame right before browser paint
    const rafId = requestAnimationFrame(() => {
      resetAllScrolls();
    });

    // Stage 2: Short delay (50ms) to catch synchronous component mounting
    const timer1 = setTimeout(() => {
      resetAllScrolls();
    }, 50);

    // Stage 3: Medium delay (150ms) to counteract quick API state updates
    const timer2 = setTimeout(() => {
      resetAllScrolls();
    }, 150);

    // Stage 4: Extended delay (350ms) to guarantee position if tables/charts expand DOM
    const timer3 = setTimeout(() => {
      if (window.scrollY > 0 || (document.documentElement && document.documentElement.scrollTop > 0)) {
        resetAllScrolls();
      }
    }, 350);

    prevPathRef.current = currentPath;

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [pathname, searchParams]);

  return null;
}
