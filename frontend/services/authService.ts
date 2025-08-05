import axios from "axios";

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
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
      { refresh_token: currentRefreshToken }
    );

    const { access_token, refresh_Token: newRefreshToken } = response.data;

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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
