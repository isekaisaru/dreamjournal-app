"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import apiClient from "@/lib/apiClient";

interface User {
  id: string;
  email?: string;
  username?: string;
}

type AuthContextType = {
  isLoggedIn: boolean | null;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
  user: User | null;
  userId: string | null;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  error: string | null;
  deleteUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(async () => {
    try {
      // バックエンドがHttpOnly Cookieをクリアします
      await apiClient.post(`/auth/logout`);
    } catch (error) {
      console.error("AuthContext: Server logout API call failed:", error);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      setUserId(null);
      setError(null);
      router.push("/login");
      router.refresh();
    }
  }, [router]);

  const deleteUser = useCallback(async () => {
    if (!userId) {
      console.error("AuthContext: User ID not found for deletion.");
      setError("ユーザーIDが見つからないため、アカウントを削除できません。");
      throw new Error("User ID not found for deletion");
    }

    try {
      await apiClient.delete(`/users/${userId}`);
      // ログアウト処理を呼び出して状態をクリアし、リダイレクト
      await logout();
    } catch (error) {
      console.error("AuthContext: User deletion API call failed:", error);
      setError(
        "アカウントの削除に失敗しました。サーバーエラーが発生した可能性があります。"
      );
      throw error;
    }
  }, [userId, setError, logout]);

  const login = useCallback(
    (userData: User) => {
      setUser(userData);
      setUserId(userData.id);
      setIsLoggedIn(true);
      setError(null);
      router.push("/home");
      router.refresh();
    },
    [router, setUser, setUserId, setIsLoggedIn, setError]
  );

  useEffect(() => {
    let isMounted = true;

    const publicPaths = ["/login", "/register", "/trial"];
    if (publicPaths.includes(pathname)) {
      // ログイン/登録ページなど、認証が不要なページではAPIコールをスキップ
      setIsLoggedIn(false);
      return;
    }
    const checkAuthStatus = async () => {
      // ページ遷移時に認証状態を確認するAPIを叩く
      try {
        // apiClient.getにレスポンスの型<{ user: ... }>を指定します
        const response = await apiClient.get<{
          user: { id: number; username: string; email?: string };
        }>("/auth/verify");

        // responseとresponse.userの存在を確認します
        if (response && response.user) {
          setUser({ ...response.user, id: String(response.user.id) });
          setUserId(String(response.user.id)); // idを文字列に変換
          setIsLoggedIn(true);
        } else {
          // レスポンスが期待通りでない場合もエラーとして扱う
          throw new Error("Verification failed");
        }
      } catch (error) {
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
          setUserId(null);
        }
      }
    };
    checkAuthStatus();
    return () => {
      isMounted = false;
    };
  }, [pathname]); // 依存配列は変更なし

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        user,
        userId,
        setUserId,
        login,
        logout,
        error,
        deleteUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
