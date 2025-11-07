// utils/isSafari.ts
export const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isSafariBrowser =
    ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
  return isSafariBrowser;
};

