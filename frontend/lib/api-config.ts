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
    return url.replace(API_PREFIX_PATTERN, "").replace(/\/+$/, "");
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
    // Client-side (browser)
    //
    // Vercel production: always use the same-origin /proxy/ rewrite so that
    // auth cookies are set on the Vercel domain and sent on every subsequent
    // request.  Direct cross-origin calls to Render break cookie auth because
    // browsers apply SameSite restrictions and refuse to attach cookies to
    // third-party requests.  NEXT_PUBLIC_API_URL is intentionally ignored here
    // to prevent it from pointing the browser at Render directly.
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
      return "/proxy";
    }

    // Vercel preview: return empty string so requests are clearly misconfigured
    // rather than silently hitting production data.
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview") {
      return "";
    }

    // Non-Vercel deployments (self-hosted, Docker): honour the explicit URL.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
    }

    return "http://localhost:3001";
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
