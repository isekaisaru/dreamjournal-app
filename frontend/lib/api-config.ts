/**
 * API URL configuration for different environments
 * Handles client-side vs server-side API communication
 */

/**
 * Get the appropriate API URL based on the environment
 * - Server-side (Next.js container): Direct connection to the backend (Render or Docker service)
 * - Client-side (browser): Uses relative path for Vercel Rewrites
 */
export function getApiUrl(): string {
  const API_PREFIX_PATTERN = /\/api\/v1\/?$/;

  function normalizeBaseUrl(url: string): string {
    return url.replace(API_PREFIX_PATTERN, "");
  }

  // Check if we're running on the server side
  if (typeof window === "undefined") {
    // Server-side: Use the full backend URL.
    // In production (Vercel), this will be the Render URL.
    // In local Docker, this will be the internal service name.
    return normalizeBaseUrl(
      process.env.INTERNAL_API_URL || "https://dreamjournal-app.onrender.com"
    );
  } else {
    // Client-side: Use a relative path to leverage Vercel Rewrites.
    // This makes the browser request to the same origin, solving cookie issues.
    // In local dev, next.config.js rewrites this to http://localhost:3001.
    // In production, Vercel rewrites this to the Render URL.
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  }
}

/**
 * Create a full API endpoint URL
 * @param endpoint - The API endpoint path (e.g., '/auth/me', '/dreams/my_dreams')
 * @returns Full URL string
 */
export function createApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
