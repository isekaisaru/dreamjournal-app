"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
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
    console.log("AuthContext: logout initiated");
    try {
      // バックエンドがHttpOnly Cookieをクリアします
      await apiClient.post(`/auth/logout`);
      console.log("AuthContext: Server logout successful");
    } catch (error) {
      console.warn("AuthContext: Server logout API call failed:", error);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      setUserId(null);
      setError(null);
      console.log("AuthContext: Local cleanup done, redirecting to /login");
      router.push("/login");
      router.refresh();
    }
  }, [router]);

const deleteUser = useCallback(async () => {
    console.log("AuthContext: deleteUser initiated");
    if (!userId) {
      console.error("AuthContext: User ID not found for deletion.");
      setError("ユーザーIDが見つからないため、アカウントを削除できません。");
      throw new Error("User ID not found for deletion");
    }

    try {
      await apiClient.delete(`/users/${userId}`);
      console.log("AuthContext: User deletion successful on server.");
      // ログアウト処理を呼び出して状態をクリアし、リダイレクト
      await logout();
    } catch (error) {
      console.error("AuthContext: User deletion API call failed:", error);
      setError("アカウントの削除に失敗しました。サーバーエラーが発生した可能性があります。");
      throw error;
    }
  }, [userId, setError, logout]);

  const login = useCallback(
    (userData: User) => {
      setUser(userData);
      setUserId(userData.id);
      setIsLoggedIn(true);
      setError(null);
      console.log("AuthContext: Login successful, state updated.");
      router.push("/home");
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    let isMounted = true;
    const checkAuthStatus = async () => {
      console.log("AuthContext: useEffect - Checking auth status...", { pathname });
      // ページ遷移時に認証状態を確認するAPIを叩く
      try {
        // /auth/verify はCookieを元にユーザー情報を返す
        const response = await apiClient.get("/auth/verify");
        if (response.status === 200 && response.data.user) {
          setUser(response.data.user);
          setUserId(response.data.user.id);
          setIsLoggedIn(true);
        } else {
          // レスポンスが期待通りでない場合もエラーとして扱う
          throw new Error("Verification failed");
        }
      } catch (error) {
        if (isMounted) {
          console.log(
            "AuthContext: Verification failed, user is not authenticated."
          );
          setIsLoggedIn(false);
          setUser(null);
          setUserId(null);

          const publicPaths = ["/login", "/register", "/trial"];
          if (!publicPaths.includes(pathname)) {
            console.log("AuthContext: Not on public path and determined unauthenticated, redirecting to /login from useEffect");
            router.push("/login");
          }
        }
      }
    };
    checkAuthStatus();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

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