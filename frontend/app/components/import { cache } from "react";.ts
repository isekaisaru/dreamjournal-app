import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import apiClient from "./apiClient";

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface AuthResult {
  user: User | null;
  isAuthenticated: boolean;
  token?: string | null;
}

/**
 * A cached, server-side function to get the current user's authentication status.
 * This function is memoized per request.
 @returns {Promise<AuthResult>}
 */
export const getServerAuth = cache(
  async (): Promise<AuthResult> => {
    const cookieStore = cookies();
    const token = cookieStore.get("access_token")?.value;

    if (!token) {
      return { user: null, isAuthenticated: false, token: null };
    }

    try {
      // The 'Cookie' header must be manually passed in Server Component fetches
      const response = await apiClient.get("/auth/me", {
        headers: { Cookie: `access_token=${token}` },
      });
      return { user: response.data.user, isAuthenticated: true, token };
    } catch (error) {
      // This could happen if the token is invalid or expired
      console.error("Server auth verification failed:", error);
      return { user: null, isAuthenticated: false, token: null };
    }
  }
);

/**
 * A helper function for page components that require authentication.
 * It gets the user and redirects to '/login' if they are not authenticated.
@returns {Promise<User>}
 */
export async function requireAuth(): Promise<User> {
  const { user, isAuthenticated } = await getServerAuth();
  if (!isAuthenticated || !user) {
    redirect("/login");
  }
  return user;
}