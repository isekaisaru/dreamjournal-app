import { createApiUrl } from "./api-config";
import {
  Dream,
  Emotion,
  LoginCredentials,
  RegisterCredentials,
  User as BackendUser, // バックエンドからのUser型（id: number）
} from "@/app/types";

// Exporting type definitions to be used in other files
export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface ApiClient {
  get<T = unknown>(url: string): Promise<T>;
  post<T = unknown>(url: string, data?: any): Promise<T>;
  put<T = unknown>(url: string, data?: any): Promise<T>;
  delete<T = unknown>(url: string): Promise<T>;
}

type ApiFetchOptions = RequestInit & { token?: string };

/**
 * A centralized fetch function for API communication.
 * It handles URL creation, JSON content type, and error handling.
 * For client-side requests, it includes credentials (cookies).
 * For server-side, the token must be passed explicitly in the options.
 *
 * @param endpoint APIエンドポイント (例: '/dreams/my_dreams')
 * @param options 追加のfetchオプション。サーバーサイドで認証が必要な場合は `token` を含める。
 * @returns APIからのJSONレスポンス
 */
async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const url = createApiUrl(endpoint);
  const { token, ...fetchOptions } = options;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const isServer = typeof window === "undefined";

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      ...defaultHeaders,
      ...fetchOptions.headers,
    },
  };

  if (isServer) {
    // Server-side: Manually add cookie and disable cache
    if (token) {
      (finalOptions.headers as Record<string, string>)["Cookie"] =
        `access_token=${token}`;
    }
    finalOptions.cache = "no-store";
  } else {
    // Client-side: Browser handles credentials
    finalOptions.credentials = "include";
  }

  const response = await fetch(url, finalOptions);

  if (!response.ok) {
    // 401 Unauthorized は認証失敗であり、予期される動作の一部。
    // そのため、コンソールにエラーを出力せずに例外をスローする。
    if (response.status !== 401) {
      const errorBody = await response.text();
      console.error(
        `API Error: ${response.status} ${response.statusText} for endpoint ${endpoint}`,
        errorBody
      );
    }
    throw new Error(
      `API request to ${endpoint} failed with status ${response.status}.`
    );
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
  const endpoint = `/dreams/my_dreams?${searchParams.toString()}`;
  return apiFetch(endpoint, { token });
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
    method: "DELETE",
  });
}

export async function getEmotions(): Promise<Emotion[]> {
  return apiFetch("/emotions");
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
    if (error instanceof Error && error.message.includes("401")) {
      return null;
    }
    // その他のエラーは再スロー
    throw error;
  }
}

const apiClient: ApiClient = {
  // axios のような汎用メソッドを提供
  get: <T>(url: string) => apiFetch<T>(url),
  post: <T>(url: string, data?: any) =>
    apiFetch<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : null,
    }),
  put: <T>(url: string, data?: any) =>
    apiFetch<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : null,
    }),
  delete: <T>(url: string) =>
    apiFetch<T>(url, {
      method: "DELETE",
    }),
};

export default apiClient;
