/**
 * Browser detection utility for Safari-specific functionality
 */

import { useState, useEffect } from 'react';

export function useBrowserDetection() {
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Check if browser is Safari
    const ua = navigator.userAgent.toLowerCase();
    const isSafariBrowser = ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1;
    setIsSafari(isSafariBrowser);
  }, []);

  return { isSafari };
}

