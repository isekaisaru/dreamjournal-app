/**
 * A centralized fetch function for API communication.
 * It handles URL creation, JSON content type, and error handling.
 * For client-side requests, it includes credentials (cookies).
 * For server-side, the token must be passed explicitly in the options.
 *
 * @param endpoint APIエンドポイント (例: '/dreams')

* @param options 追加のfetchオプション。サーバーサイドで認証が必要な場合は `token` を含める。
 * @returns APIからのJSONレスポンス
 */
import { createApiUrl } from "./api-config";
import type {
  Dream,
  Emotion,
  BackendUser,
  User,
  LoginCredentials,
  RegisterCredentials,
  DreamInput,
} from "@/app/types";

export class ApiError extends Error {
  status!: number;
  data?: any;
  constructor(message: string) {
    super(message);
  }
}

type ApiFetchOptions = RequestInit & { token?: string };

export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const url = createApiUrl(endpoint);
  const { token, ...fetchOptions } = options;

  const defaultHeaders: HeadersInit = {
    Accept: "application/json",
  };

  const isServer = typeof window === "undefined";

  // ① credentials はクライアントのみ（サーバーではCookieを手動転送）
  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
    ...(isServer ? {} : { credentials: "include" as RequestCredentials }),
  };

  // ② Content-Type は bodyがある非GET/HEAD リクエストのみ付与
  const method = (fetchOptions.method || "GET").toUpperCase();
  const hasBody = finalOptions.body !== undefined && finalOptions.body !== null;
  if (!["GET", "HEAD"].includes(method) && hasBody) {
    (finalOptions.headers as Record<string, string>)["Content-Type"] =
      "application/json";
  }

  if (isServer) {
    // Server-side: Cookieヘッダーを手動で設定
    // 既に上位でCookieが設定されている場合はそれを尊重
    const existingCookie = (fetchOptions.headers as Record<string, string>)
      ?.Cookie;
    if (!existingCookie && token) {
      (finalOptions.headers as Record<string, string>)["Cookie"] =
        `access_token=${encodeURIComponent(token)}`;
    }
  }

  // Always disable cache to ensure fresh data (Fix Stale Data Issue)
  finalOptions.cache = "no-store";

  // ③ Renderコールドスタート対策: 15秒でタイムアウト（無限ハングを防止）
  const TIMEOUT_MS = 15_000;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);

  // 呼び出し元のsignalがあれば、タイムアウトsignalと組み合わせる（上書きしない）
  const callerSignal = fetchOptions.signal;
  if (typeof AbortSignal.any === "function") {
    const signals = callerSignal
      ? [callerSignal, timeoutController.signal]
      : [timeoutController.signal];
    finalOptions.signal = AbortSignal.any(signals);
  } else {
    // AbortSignal.any未対応環境ではタイムアウトsignalのみ使用
    finalOptions.signal = timeoutController.signal;
  }

  let response: Response;
  try {
    response = await fetch(url, finalOptions);
  } catch (fetchError) {
    // ④ AbortError判定: Node環境ではDOMExceptionが無い場合があるため name で判定
    if ((fetchError as Error)?.name === "AbortError") {
      const error = new ApiError(
        `API request to ${endpoint} timed out after ${TIMEOUT_MS / 1000}s.`
      );
      error.status = 504;
      throw error;
    }
    throw fetchError;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = new ApiError(
      `API request to ${endpoint} failed with status ${response.status}.`
    );
    error.status = response.status;
    try {
      const errorData = await response.json();
      // Railsのエラー形式に合わせて調整 (より堅牢な形式)
      if (errorData.error) {
        error.message = errorData.error;
      } else if (Array.isArray(errorData.errors)) {
        error.message = errorData.errors.join(", ");
      } else if (
        typeof errorData.errors === "object" &&
        errorData.errors !== null
      ) {
        // { "email": ["has already been taken"], "password": ["is too short"] } のような形式に対応
        error.message = Object.entries(errorData.errors)
          .map(
            ([key, messages]) =>
              `${key} ${Array.isArray(messages) ? messages.join(", ") : messages}`
          )
          .join("; ");
      } else if (errorData.message) {
        error.message = errorData.message;
      }

      error.data = errorData;
    } catch {
      // JSONのパースに失敗した場合
      console.error(`Could not parse error response for ${endpoint}:`);
    }
    throw error;
  }

  // Handle responses with no content
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

// --- Server Component Data Fetching ---

/**
 * 現在のユーザーの夢を取得します。
 * @param token ユーザーのアクセストークン
 * @param searchParams 夢をフィルタリングするための検索パラメータ
 * @returns 夢の配列を解決するPromise
 */
export async function getMyDreams(
  token: string,
  searchParams: URLSearchParams
): Promise<Dream[]> {
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/dreams?${queryString}` : "/dreams";
  // 明示的にキャッシュを無効化 (User Request No.2)
  return apiFetch(endpoint, { token, cache: "no-store" });
}

/**
 * 現在認証されているユーザーのデータを取得します。
 * @param token ユーザーのアクセストークン
 * @returns The user object.
 */
export async function getMe(token: string): Promise<User> {
  const data = await apiFetch<{ user: BackendUser }>("/auth/me", { token });
  return { ...data.user, id: String(data.user.id) };
}

// --- Client Component Functions ---

export async function clientLogin(
  credentials: LoginCredentials
): Promise<{ user: User }> {
  const response = await apiFetch<{ user: BackendUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  return {
    user: { ...response.user, id: String(response.user.id) },
  };
}

export async function clientRegister(
  credentials: RegisterCredentials
): Promise<{ user: User }> {
  // Rails often expects parameters nested under a model key
  const response = await apiFetch<{ user: BackendUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ user: credentials }),
  });
  return {
    user: { ...response.user, id: String(response.user.id) },
  };
}

export async function clientLogout(): Promise<null> {
  return apiFetch("/auth/logout", {
    method: "POST",
  });
}

export async function getEmotions(): Promise<Emotion[]> {
  return apiFetch("/emotions");
}

export async function createDream(dream: DreamInput): Promise<Dream> {
  return apiFetch<Dream>("/dreams", {
    method: "POST",
    body: JSON.stringify({ dream }),
  });
}

export async function previewAnalysis(
  content: string
): Promise<{ analysis: string; emotion_tags: string[] }> {
  return apiFetch<{ analysis: string; emotion_tags: string[] }>(
    "/dreams/preview_analysis",
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
}

export async function verifyAuth(): Promise<{ user: User } | null> {
  try {
    const response = await apiFetch<{ user: BackendUser }>("/auth/verify");
    if (!response || !response.user) return null;
    return {
      user: { ...response.user, id: String(response.user.id) },
    };
  } catch (error) {
    // 401エラーの場合は認証されていないとみなし、nullを返す
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    // その他のエラーは再スロー
    throw error;
  }
}

const apiClient = {
  get: <T>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: "GET", cache: "no-store" }),
  post: <T>(url: string, data?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : null,
    }),
  put: <T>(url: string, data?: any, options?: ApiFetchOptions) =>
    apiFetch<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : null,
    }),
  delete: <T>(url: string, options?: ApiFetchOptions) =>
    apiFetch<T>(url, { ...options, method: "DELETE" }),
};

export default apiClient;
