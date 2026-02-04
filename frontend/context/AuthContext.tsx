"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

interface User {
  id: string;
  email?: string;
  username?: string;
}

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

type AuthContextType = {
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  user: User | null;
  userId: string | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  deleteUser: () => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // isLoggedInは後方互換性のために残す
  const isLoggedIn = authStatus === "authenticated";

  // ---------------------------
  // 初回マウント時のみ認証チェック
  // ---------------------------
  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      try {
        const res = await apiClient.get<{ user: User }>("/auth/verify");

        if (!mounted) return;

        if (res?.user) {
          setUser({ ...res.user, id: String(res.user.id) });
          setUserId(String(res.user.id));
          setAuthStatus("authenticated");
        } else {
          setAuthStatus("unauthenticated");
        }
      } catch (err) {
        if (mounted) {
          setAuthStatus("unauthenticated");
          setUser(null);
          setUserId(null);
        }
      }
    };

    verifyToken();

    return () => {
      mounted = false;
    };
  }, []); // ←依存配列なし。初回だけ！

  // ---------------------------
  // login
  // ---------------------------
  const login = useCallback((userData: User) => {
    setUser(userData);
    setUserId(userData.id);
    setAuthStatus("authenticated");
  }, []);

  // ---------------------------
  // logout
  // ---------------------------
  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      setAuthStatus("unauthenticated");
      setUser(null);
      setUserId(null);
      setError(null);

      router.push("/login");
    }
  }, [router]);

  // ---------------------------
  // deleteUser
  // ---------------------------
  const deleteUser = useCallback(async () => {
    if (!userId) {
      setError("ユーザーIDが存在しません");
      return;
    }
    try {
      await apiClient.delete(`/users/${userId}`);
      await logout();
    } catch (err) {
      setError("アカウント削除に失敗しました");
    }
  }, [userId, logout]);

  return (
    <AuthContext.Provider
      value={{
        authStatus,
        isLoggedIn,
        user,
        userId,
        login,
        logout,
        deleteUser,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used in AuthProvider");
  return ctx;
};
