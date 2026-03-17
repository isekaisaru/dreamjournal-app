const DEFAULT_PUBLIC_BACKEND_URL = "https://dreamjournal-app.onrender.com";

type BackendEnv = {
  INTERNAL_API_URL?: string;
  NEXT_PUBLIC_API_URL?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
};

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isPrivateRuntimeHost(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ["backend", "localhost", "127.0.0.1"].includes(hostname);
  } catch {
    return true;
  }
}

export function resolveBackendUrlFromEnv(env: BackendEnv): string | null {
  const internalApiUrl = env.INTERNAL_API_URL;
  const publicApiUrl = env.NEXT_PUBLIC_API_URL;
  const isVercelRuntime = env.VERCEL === "1";
  const isVercelProduction = isVercelRuntime && env.VERCEL_ENV === "production";

  const configuredCandidates = isVercelRuntime
    ? [publicApiUrl, internalApiUrl]
    : [internalApiUrl, publicApiUrl];

  for (const candidate of configuredCandidates) {
    if (!candidate) continue;
    if (isVercelRuntime && isPrivateRuntimeHost(candidate)) continue;
    return normalizeBaseUrl(candidate);
  }

  // Preview/local/self-hosted must fail fast instead of leaking traffic to the shared production backend.
  if (isVercelProduction) {
    return DEFAULT_PUBLIC_BACKEND_URL;
  }

  return null;
}

export function resolveBackendUrl(): string | null {
  return resolveBackendUrlFromEnv(process.env);
}
