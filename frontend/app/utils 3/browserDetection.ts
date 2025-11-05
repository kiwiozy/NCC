/**
 * Browser Detection Utility
 * Detects the user's browser for applying browser-specific fixes
 */

import { useState, useEffect } from 'react';

export type BrowserType = 'safari' | 'chrome' | 'firefox' | 'edge' | 'unknown';
export type BrowserInfo = {
  type: BrowserType;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  version?: string;
};

/**
 * Detects the browser type and version
 * Works on both client and server (SSR-safe)
 */
export function detectBrowser(): BrowserInfo {
  // SSR check - return unknown during server-side rendering
  if (typeof window === 'undefined') {
    return {
      type: 'unknown',
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  let browserType: BrowserType = 'unknown';
  let version: string | undefined;

  // Safari detection (must check before Chrome since Chrome includes Safari in UA)
  if (/safari/.test(userAgent) && !/chrome/.test(userAgent) && !/chromium/.test(userAgent)) {
    browserType = 'safari';
    const match = userAgent.match(/version\/([\d.]+)/);
    version = match ? match[1] : undefined;
  }
  // Chrome detection
  else if (/chrome/.test(userAgent) && !/edg/.test(userAgent)) {
    browserType = 'chrome';
    const match = userAgent.match(/chrome\/([\d.]+)/);
    version = match ? match[1] : undefined;
  }
  // Edge detection
  else if (/edg/.test(userAgent)) {
    browserType = 'edge';
    const match = userAgent.match(/edg\/([\d.]+)/);
    version = match ? match[1] : undefined;
  }
  // Firefox detection
  else if (/firefox/.test(userAgent)) {
    browserType = 'firefox';
    const match = userAgent.match(/firefox\/([\d.]+)/);
    version = match ? match[1] : undefined;
  }

  return {
    type: browserType,
    isSafari: browserType === 'safari',
    isChrome: browserType === 'chrome',
    isFirefox: browserType === 'firefox',
    isEdge: browserType === 'edge',
    version,
  };
}

/**
 * React hook for browser detection
 * Only runs on client-side, SSR-safe
 */
export function useBrowserDetection(): BrowserInfo {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo>({
    type: 'unknown',
    isSafari: false,
    isChrome: false,
    isFirefox: false,
    isEdge: false,
  });

  useEffect(() => {
    // Only detect on client-side
    setBrowserInfo(detectBrowser());
  }, []);

  return browserInfo;
}

