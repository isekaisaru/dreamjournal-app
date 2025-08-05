import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createApiUrl } from "./api-config";
import type { User } from "./apiClient";

export interface AuthResult {
  user: User | null;
  isAuthenticated: boolean;
  token?: string | null;
}

/**
 * A cached, server-side function to get the current user's authentication status.
 * This function is memoized per request.
 * @returns {Promise<AuthResult>} The authentication result.
 */
export const getServerAuth = cache(async (): Promise<AuthResult> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return { user: null, isAuthenticated: false, token: null };
  }

  try {
    const response = await fetch(createApiUrl("/auth/me"), {
      headers: {
        Cookie: `access_token=${token}`,
      },
      // Always re-fetch, do not use cache for authentication status
      cache: "no-store",
    });

    if (!response.ok) {
      // トークンの検証失敗は、未ログイン状態では正常な動作。
      // エラーをスローするのではなく、未認証状態を返して処理を続行させる。
      // これにより、コンソールに不要なエラーが表示されるのを防ぐ。
      return { user: null, isAuthenticated: false, token: null };
    }
    const data = await response.json();
    const backendUser = data.user;

    if (!backendUser) {
      return { user: null, isAuthenticated: false, token: null };
    }

    // The backend returns a user object with a numeric ID. We need to convert it to a string
    // to match the frontend User type definition used across the application.
    const user: User = {
      ...backendUser,
      id: String(backendUser.id),
    };
    return { user: user, isAuthenticated: true, token };
  } catch (error) {
    // This could happen if the token is invalid or expired
    console.error("Server auth verification failed:", error);
    return { user: null, isAuthenticated: false, token: null };
  }
});

/**
 * A helper function for page components that require authentication.
 * It gets the user and redirects to '/login' if they are not authenticated.
 * @returns {Promise<User>} The authenticated user.
 */
export async function requireAuth(): Promise<User> {
  const { user, isAuthenticated } = await getServerAuth();
  if (!isAuthenticated || !user) {
    redirect("/login");
  }
  return user;
}
