import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";

interface DecodedToken {
  user_id: string;
  exp: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// useAuth関数の定義
export default function useAuth(redirectAfterLogin: boolean = false) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const router = useRouter();

  const logout = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem("access_token");
      if (accessToken) {
        await axios.post(
          `${API_URL}/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      }
    } catch (error) {
      console.warn("サーバー側のログアウト処理に失敗しました:", error);
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setIsAuthenticated(false);
    setUserId(null);
    router.push("/login");
  }, [router]);

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const token = localStorage.getItem("access_token");

    if (!token || token === "null" || token === "undefined") {
      console.warn("アクセストークンが不正です。ログアウトします。");
      logout();
      return null;
    }
    try {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(token);
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now + 60) {
        console.log("トークン期限切れが間近！リフレッシュトークンを使って更新");

        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          logout();
          return null;
        }
        
        const response = await axios.post(
          `${API_URL}/auth/refresh`, 
          { refresh_token: refreshToken }, // リフレッシュトークンをリクエストボディに含める
        );

        if (response.data.access_token) {
          localStorage.setItem("access_token", response.data.access_token);
          return response.data.access_token; // 更新されたアクセストークンを返す
        } else {
          logout();
          return null;
        }
      }
      return token;
    } catch (error) {
      console.error("アクセストークンのリフレッシュに失敗しました", error);
      logout();
      return null;
    }
  }, [logout]);

  const deleteUser = async () => {
    const token = await getValidAccessToken();
    if (!token) return;
    try {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("アカウントは削除されました。");
      logout();
    } catch {
      alert("アカウントの削除に失敗しました。");
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getValidAccessToken();
      // トークンが存在しない場合の処理
      if (!token) {
        setIsAuthenticated(false);
        setUserId(null);
        setMessage("ログインが必要です。");
        router.push("/login"); //トークンがない場合はログインページにリダイレクト
        return; // 早期リターンでAPIリクエストをスキップ
      }

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 200) {
          setIsAuthenticated(true);
          setUserId(jwtDecode<DecodedToken>(token).user_id);
          setMessage("ログインに成功しました");
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          if (redirectAfterLogin) {
            router.push("/home");
          }
        } else {
          setIsAuthenticated(false);
          setMessage("ログインに失敗しました。もう一度お試しください。");
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        setIsAuthenticated(false);
        setMessage("サーバーに接続できません。もう一度お試しください。");
      }
    };

    checkAuth();
  }, []);

  return {
    isAuthenticated,
    message,
    userId,
    logout,
    deleteUser,
    getValidAccessToken,
  };
}
