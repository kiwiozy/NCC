/**
 * Console Filter - Suppresses noisy errors from browser extensions and missing source maps
 * 
 * Filters out:
 * - Grammarly extension errors (grm ERROR)
 * - Missing source maps (404 .map files)
 * - Safari extension style loading errors
 */

if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  // Patterns to suppress
  const suppressPatterns = [
    /grm ERROR/i,
    /RenderWithStyles/i,
    /safari-web-extension/i,
    /\.module\.css\.mjs\.map/i,
    /Failed to load resource.*\.map/i,
    /Grammarly\.js/i,
  ];

  // Check if message should be suppressed
  const shouldSuppress = (args: any[]): boolean => {
    const message = args.join(' ');
    return suppressPatterns.some(pattern => pattern.test(message));
  };

  // Override console.error
  console.error = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    if (!shouldSuppress(args)) {
      originalWarn.apply(console, args);
    }
  };

  // Suppress window error events from extensions
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;
    const message = event.message || '';
    
    // Suppress errors from:
    // 1. Extension stylesheets
    // 2. Source maps
    // 3. Grammarly
    if (
      target?.tagName === 'LINK' ||
      message.includes('safari-web-extension') ||
      message.includes('.map') ||
      message.includes('grm ERROR') ||
      message.includes('Grammarly')
    ) {
      event.stopPropagation();
      event.preventDefault();
      return false;
    }
  }, true); // Use capture phase to catch errors early

  // Also suppress unhandledrejection for extension-related promises
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.toString() || '';
    if (
      reason.includes('safari-web-extension') ||
      reason.includes('grm ERROR') ||
      reason.includes('Grammarly')
    ) {
      event.preventDefault();
      return false;
    }
  });

  // Dev mode notification
  if (process.env.NODE_ENV === 'development') {
    console.log(
      '%c🔇 Console Filter Active',
      'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      '\nSuppressing: Grammarly errors, source map 404s, extension errors'
    );
  }
}

export {};

