import { Capacitor } from '@capacitor/core';

export const getApiUrl = (path: string) => {
  // 1. Detect if running as a native app (APK/iOS)
  const isNative = Capacitor.isNativePlatform();

  // 2. If it's a native app, use the Android-specific URL or fallback to the general one
  if (isNative) {
    const baseUrl = import.meta.env.VITE_API_URL_ANDROID || import.meta.env.VITE_API_URL || '';
    return `${baseUrl}${path}`;
  }

  // 3. For Web: Use relative paths by default to avoid CORS and domain mismatch errors
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file://')) {
    return path;
  }
  
  // 4. Fallback for other cases (like local file access without Capacitor)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}${path}`;
};
