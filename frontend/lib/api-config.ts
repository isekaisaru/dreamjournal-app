/**
 * API URL configuration for different environments
 * Handles client-side vs server-side API communication in Docker environment
 */

/**
 * Get the appropriate API URL based on the environment
 * - Server-side (Next.js container): Uses Docker service name 'backend:3001'
 * - Client-side (browser): Uses localhost:3001
 */
export function getApiUrl(): string {
  // Check if we're running on the server side
  if (typeof window === "undefined") {
    // Server-side: Use Docker internal network
    return process.env.INTERNAL_API_URL || "http://backend:3001";
  } else {
    // Client-side: Use localhost (accessible from browser)
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
