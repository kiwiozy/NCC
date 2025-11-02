/**
 * Safari Sticky Fix Hook
 * 
 * Fixes Safari's position:sticky bug (WebKit Bug #195983)
 * Uses JavaScript to manually handle sticky behavior when CSS fails
 * 
 * Detects Safari and applies position:fixed when element would normally be sticky
 */

import { useEffect, useRef, RefObject } from 'react';

interface UseStickyFixOptions {
  top?: number;
  enabled?: boolean;
  scrollContainer?: HTMLElement | null;
}

export function useStickyFix<T extends HTMLElement>(
  ref: RefObject<T>,
  options: UseStickyFixOptions = {}
) {
  const { top = 0, enabled = true, scrollContainer } = options;
  const isStickyRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialRectRef = useRef<{ top: number; left: number; width: number } | null>(null);
  const originalStylesRef = useRef<{
    position: string;
    top: string;
    left: string;
    width: string;
    zIndex: string;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;
    // Get container - try provided one or parent element
    const container = scrollContainer || (element.parentElement as HTMLElement);
    
    // Wait for container to be available
    if (!container) {
      // Wait for next frame and try again
      requestAnimationFrame(() => {
        const containerRetry = scrollContainer || (ref.current?.parentElement as HTMLElement);
        if (containerRetry && ref.current && enabled) {
          // Container now available, setup will happen on next effect run
        }
      });
      return;
    }

    // Detect if we're in Safari
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Only apply fix in Safari (other browsers use native CSS sticky)
    if (!isSafari) return;

    // Get initial position and store it
    const initialRect = element.getBoundingClientRect();
    initialRectRef.current = {
      top: initialRect.top,
      left: initialRect.left,
      width: initialRect.width,
    };

    // Store original computed styles
    const computedStyle = window.getComputedStyle(element);
    originalStylesRef.current = {
      position: computedStyle.position,
      top: computedStyle.top,
      left: computedStyle.left,
      width: computedStyle.width,
      zIndex: computedStyle.zIndex || '100',
    };

    // Create sentinel element before the sticky element
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.width = '100%';
    sentinel.style.pointerEvents = 'none';
    sentinel.style.position = 'absolute';
    sentinel.style.top = '0';
    sentinel.style.left = '0';
    sentinel.style.visibility = 'hidden';
    sentinelRef.current = sentinel;
    
    // Insert sentinel right before element in the scroll container
    if (container.firstChild !== element) {
      container.insertBefore(sentinel, element);
    } else if (element.previousElementSibling) {
      container.insertBefore(sentinel, element);
    } else if (element.parentElement) {
      // Fallback: insert before element in parent
      element.parentElement.insertBefore(sentinel, element);
    }

    // IntersectionObserver to detect when element should be sticky
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const shouldBeSticky = !entry.isIntersecting;
          
          if (shouldBeSticky && !isStickyRef.current && initialRectRef.current && ref.current) {
            // Switch to fixed positioning
            const elem = ref.current;
            elem.style.position = 'fixed';
            elem.style.top = `${top}px`;
            elem.style.left = `${initialRectRef.current.left}px`;
            elem.style.width = `${initialRectRef.current.width}px`;
            elem.style.zIndex = originalStylesRef.current?.zIndex || '100';
            isStickyRef.current = true;
          } else if (!shouldBeSticky && isStickyRef.current && originalStylesRef.current && ref.current) {
            // Switch back to relative positioning
            const elem = ref.current;
            elem.style.position = originalStylesRef.current.position || 'relative';
            elem.style.top = originalStylesRef.current.top;
            elem.style.left = originalStylesRef.current.left;
            elem.style.width = originalStylesRef.current.width;
            elem.style.zIndex = originalStylesRef.current.zIndex;
            isStickyRef.current = false;
          }
        });
      },
      {
        root: container,
        rootMargin: `-${top}px 0px 0px 0px`,
        threshold: [0, 1],
      }
    );

    // Observe the sentinel element
    observerRef.current.observe(sentinel);

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (sentinelRef.current && sentinelRef.current.parentElement) {
        sentinelRef.current.parentElement.removeChild(sentinelRef.current);
        sentinelRef.current = null;
      }
      // Restore original styles
      if (originalStylesRef.current && ref.current) {
        const elem = ref.current;
        elem.style.position = originalStylesRef.current.position;
        elem.style.top = originalStylesRef.current.top;
        elem.style.left = originalStylesRef.current.left;
        elem.style.width = originalStylesRef.current.width;
        elem.style.zIndex = originalStylesRef.current.zIndex;
      }
    };
  }, [ref, top, enabled, scrollContainer]);

  return isStickyRef;
}
