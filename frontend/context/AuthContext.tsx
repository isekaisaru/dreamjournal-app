"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import apiClient from "@/lib/apiClient";

interface User {
  id: string;
  email?: string;
  username?: string;
  premium?: boolean;
  age_group?: string;
  analysis_tone?: string;
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
const AUTH_HINT_KEY = "dreamjournal_auth_hint";
const PROTECTED_PATH_PREFIXES = ["/home", "/dream", "/settings", "/subscription"];

function hasAuthHint(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_HINT_KEY) === "1";
}

function setAuthHint(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    window.localStorage.setItem(AUTH_HINT_KEY, "1");
  } else {
    window.localStorage.removeItem(AUTH_HINT_KEY);
  }
}

function isProtectedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function getInitialAuthStatus(pathname: string | null): AuthStatus {
  return isProtectedPath(pathname) ? "checking" : "unauthenticated";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    getInitialAuthStatus(pathname)
  );
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // isLoggedInは後方互換性のために残す
  const isLoggedIn = authStatus === "authenticated";

  // ---------------------------
  // 初回マウント時のみ認証チェック
  // ---------------------------
  useLayoutEffect(() => {
    let mounted = true;
    const shouldVerify = hasAuthHint() || isProtectedPath(pathname);

    if (!shouldVerify) {
      setAuthStatus("unauthenticated");
      setUser(null);
      setUserId(null);
      return () => {
        mounted = false;
      };
    }

    setAuthStatus("checking");

    const verifyToken = async () => {
      try {
        const res = await apiClient.get<{ user: User }>("/auth/verify");

        if (!mounted) return;

        if (res?.user) {
          setAuthHint(true);
          setUser({ ...res.user, id: String(res.user.id) });
          setUserId(String(res.user.id));
          setAuthStatus("authenticated");
        } else {
          setAuthHint(false);
          setAuthStatus("unauthenticated");
        }
      } catch (err) {
        if (mounted) {
          setAuthHint(false);
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
  }, [pathname]);

  // ---------------------------
  // login
  // ---------------------------
  const login = useCallback((userData: User) => {
    setAuthHint(true);
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
      setAuthHint(false);
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
