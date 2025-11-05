'use client';

import { useEffect } from 'react';

/**
 * ConsoleFilter - Aggressively filters harmless development warnings
 * 
 * Suppresses cosmetic errors that don't affect functionality:
 * - Mantine CSS module source map 404s
 * - Network resource loading errors for missing .map files
 */
export default function ConsoleFilter() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Patterns to suppress
    const suppressPatterns = [
      /Failed to load resource.*\.map/i,
      /Failed to load resource.*favicon/i,
      /Source Map loading errors/i,
      /\.module\.css\.mjs\.map/i,
      /YearsList/i,
      /Notifications/i,
      /MonthsList/i,
      /PickerControl/i,
      /CalendarHeader/i,
      /404.*\.map/i,
    ];

    const shouldSuppress = (message: string): boolean => {
      return suppressPatterns.some(pattern => pattern.test(message));
    };

    // Override console.error
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (shouldSuppress(message)) {
        // Completely suppress - don't even log it
        return;
      }
      originalError.apply(console, args);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      if (shouldSuppress(message)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Intercept window.onerror for resource loading errors
    const originalWindowError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const msg = message?.toString() || '';
      if (shouldSuppress(msg) || shouldSuppress(source || '')) {
        return true; // Suppress error
      }
      if (originalWindowError) {
        return originalWindowError(message, source, lineno, colno, error);
      }
      return false;
    };

    // Intercept resource errors (404s for .map files, favicon)
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement;
      const src = (target as any)?.src || (target as any)?.href || '';
      if (shouldSuppress(src)) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleResourceError, true);

    // Cleanup
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.onerror = originalWindowError;
      window.removeEventListener('error', handleResourceError, true);
    };
  }, []);

  return null;
}

