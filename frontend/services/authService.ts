import { clientLogout, apiFetch } from "@/lib/apiClient";
import type { BackendUser } from "@/app/types";

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

export async function attemptTokenRefresh(): Promise<string | null> {
  const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!currentRefreshToken) {
    console.error(
      "authService: リフレッシュトークンが見つかりません。ログアウトを開始します。"
    );
    await performLogout();
    return null;
  }

  try {
    console.log(
      "authService: バックエンドでアクセストークンのリフレッシュを試みます..."
    );
    const response = await apiFetch<{
      access_token: string;
      refresh_token?: string; // Railsのレスポンスに合わせてキーを修正
    }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
    });

    const { access_token, refresh_token: newRefreshToken } = response;
    if (access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      if (newRefreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      console.log(
        "authService: アクセストークンが正常にリフレッシュされました。"
      );
      return access_token;
    } else {
      console.error(
        "authService: リフレッシュAPIのレスポンスにアクセストークンが含まれていません。ログアウトを開始します。"
      );
      await performLogout();
      return null;
    }
  } catch (error) {
    console.error(
      "authService: アクセストークンのリフレッシュに失敗しました。ログアウトを開始します。",
      error
    );
    await performLogout();
    return null;
  }
}

export async function performLogout(): Promise<void> {
  console.log("authService:  ログアウト処理を実行します。");
  try {
    // Call the backend to invalidate the session/token
    await clientLogout();
    console.log("authService: バックエンドでのログアウト処理が完了しました。");
  } catch (error) {
    // Even if the backend call fails, we must clear the client-side state
    console.error(
      "authService: バックエンドでのログアウトに失敗しました。",
      error
    );
  } finally {
    // Clear local storage and redirect
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}
