"use client";

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useRouter, usePathname } from "next/navigation";


interface DecodedToken {
  user_id: string;
  exp: number;
}

interface User {
  id: string;
  email?: string;
  username?: string;
}


type AuthContextType = {
  isLoggedIn: boolean | null;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean | null>>;
  userId: string | null;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  login: (accessToken: string, refreshToken: string, userData: User) => void;
  logout: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
  handleAuthenticationSuccess: (
    accessToken: string,
    refreshToken: string,
    userData: User
  ) => void;
  error: string | null;
  deleteUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TOKEN_EXPIRY_THRESHOLD_SECONDS = 60; // トークン有効期限切れの60秒前にリフレッシュ

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const logout = useCallback(async () => {
    console.log("AuthContext: logout initiated");
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout`, {
          refresh_token: refreshToken,
        });
        console.log("AuthContext: Server logout successful");
      }
    } catch (error) {
      console.warn("AuthContext: Server logout API call failed:", error);
    } finally {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setIsLoggedIn(false);
      setUserId(null);
      delete axios.defaults.headers.common["Authorization"];
      setError(null);
      console.log("AuthContext: Local cleanup done, redirecting to /login");
      router.push("/login");
    }
  }, [router]);

  

  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const tokenFromStorage = localStorage.getItem(ACCESS_TOKEN_KEY);
    console.log(
      "AuthContext: getValidAccessToken - current token from LS:",
      tokenFromStorage ? "token_present" : null
    );

    if (!tokenFromStorage || tokenFromStorage === "null" || tokenFromStorage === "undefined") {
      //console.warn(
        //"AuthContext: Access token is invalid or missing in getValidAccessToken."
      //);
      return null;
    }
    const currentToken: string = tokenFromStorage; // Ensure currentToken is string for jwtDecode

    try {
      const decoded: DecodedToken = jwtDecode<DecodedToken>(currentToken);
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp < now + TOKEN_EXPIRY_THRESHOLD_SECONDS) {
        console.log(
          "AuthContext: Access token expiring soon. Attempting refresh."
        );
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken || refreshToken === "null" || refreshToken === "undefined") {
          console.warn(
            "AuthContext: Refresh token not found for refresh attempt. Cannot refresh."
          );
          setError("リフレッシュトークンが見つかりません。再度ログインしてください。");
          // Potentially logout user here if refresh token is crucial and missing
          return null;
        }
        try {
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );

          const newAccessToken = response.data.access_token;
          const newRefreshToken = response.data.refresh_token;

          if (typeof newAccessToken === 'string' && newAccessToken.length > 0) {
            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
            axios.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

            if (typeof newRefreshToken === 'string' && newRefreshToken.length > 0) {
              localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
            }
            setError(null);
            console.log("AuthContext: Access token refreshed and saved.");
            return newAccessToken;
          } else {
            console.error(
              "AuthContext: Refresh response did not include a valid new access token."
            );
            setError("トークンのリフレッシュに失敗しました。");
            return null;
          }
        } catch (refreshError) {
          console.error(
            "AuthContext: Access token refresh API call failed:",
            refreshError
          );
          setError("トークンのリフレッシュに失敗しました。再度ログインしてください。");
          return null;
        }
      }
      // Token is valid and not expiring soon
      axios.defaults.headers.common["Authorization"] = `Bearer ${currentToken}`;
      return currentToken;
    } catch (decodeError) {
      console.error("AuthContext: Access token decode failed (possibly invalid format):", decodeError);
      setError("アクセストークンの形式が無効です。");
      // If token is undecodable, it's invalid. Clear it and logout.
      // await logout(); // This might be too aggressive
      return null;
    }
  }, [logout, setError]);

const deleteUser = useCallback(async () => {
    console.log("AuthContext: deleteUser initiated");
    const token = await getValidAccessToken();
    if (!token) {
      setError("ユーザー削除のための認証ができませんでした。再度ログインしてください。");
      throw new Error("Not authenticated for user deletion");
    }
    if (!userId) {
      setError("ユーザーIDが見つからないため、アカウントを削除できません。");
      throw new Error("User ID not found for deletion");
    }

    try {
      await axios.delete(`${API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("AuthContext: User deletion successful on server.");
    } catch (error) {
      console.error("AuthContext: User deletion API call failed:", error);
      setError("アカウントの削除に失敗しました。サーバーエラーが発生した可能性があります。");
      throw error;
    }
  }, [getValidAccessToken, userId, setError]);
  const handleAuthenticationSuccess = useCallback(
    (accessToken: string, refreshToken: string, userData: User) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
      setUserId(userData.id ? userData.id.toString() : null);
      setIsLoggedIn(true);
      setError(null);
      console.log(
        "AuthContext: Authentication success handled, state updated.",
        { userId: userData.id, isLoggedIn: true }
      );
    },
    [setIsLoggedIn, setUserId, setError]
  );

  const login = useCallback(
    (accessToken: string, refreshToken: string, userData: User) => {
      handleAuthenticationSuccess(accessToken, refreshToken, userData);
      router.push("/home");
      console.log("AuthContext: Login successful, redirecting to /home");
    },
    [handleAuthenticationSuccess, router]
  );

  useEffect(() => {
    const checkAuthStatus = async () => {
      console.log("AuthContext: useEffect - Checking auth status...", { pathname });
      // Initialize to null to indicate loading/checking status
      // setIsLoggedIn(null); // This line can cause re-render loops if isLoggedIn is in dependency array.
                           // It's better to set it based on token validation outcome.

      const validToken = await getValidAccessToken();

      if (validToken) {
        try {
          const decoded: DecodedToken = jwtDecode<DecodedToken>(validToken);
          setUserId(decoded.user_id);
          setError(null);
          setIsLoggedIn(true);
          // axios.defaults.headers.common["Authorization"] is already set in getValidAccessToken
          console.log("AuthContext: User is authenticated via useEffect.", {
            userId: decoded.user_id,
          });
        } catch (e) {
          console.error(
            "AuthContext: Error decoding token after validation in useEffect:",
            e
          );
          // If token is valid but decoding fails here (should be rare if getValidAccessToken is robust)
          await logout(); // Force logout if something is wrong with a supposedly valid token
        }
      } else {
        console.log(
          "AuthContext: No valid token found in useEffect, user is not authenticated."
        );
        // Ensure local state reflects non-authentication
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        delete axios.defaults.headers.common["Authorization"];
        setIsLoggedIn(false);
        setUserId(null);

        const publicPaths = ["/login", "/register", "/trial"];
        if (!publicPaths.includes(pathname)) {
          console.log("AuthContext: Not on public path and determined unauthenticated, redirecting to /login from useEffect");
          router.push("/login");
        }
      }
    };
    checkAuthStatus();
  }, [pathname, getValidAccessToken, logout, router, setIsLoggedIn, setUserId]); // Added setIsLoggedIn and setUserId as they are used.

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        setIsLoggedIn,
        userId,
        setUserId,
        login,
        logout,
        getValidAccessToken,
        handleAuthenticationSuccess,
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