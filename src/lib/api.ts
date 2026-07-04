export const getApiUrl = (path: string) => {
  // Use relative paths in the browser by default to avoid CORS and domain mismatch errors
  // across development, preview, and production environments.
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file://')) {
    return path;
  }
  // Fallback to VITE_API_URL (primarily for native mobile/Capacitor builds)
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}${path}`;
};
