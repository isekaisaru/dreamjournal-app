"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { clientLogout } from "@/lib/apiClient";
import { toast } from "react-hot-toast";

interface AuthNavProps {
  isAuthenticated: boolean;
}

export default function AuthNav({ isAuthenticated }: AuthNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await clientLogout();
      // Refresh the current route to re-run Server Components and update auth state
      router.refresh();
    } catch (error: any) {
      console.error("Logout failed", error);
      toast.error(error.response?.data?.error || "ログアウトに失敗しました。");
    }
  };

  return (
    <nav className="text-sm font-medium flex items-center space-x-2 md:space-x-4">
      {isAuthenticated ? (
        <>
          <Link href="/dream/new">
            <Button variant="default" className="px-3 py-2 md:px-3 md:py-3">
              夢の記録
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="px-3 py-2 md:px-3 md:py-3">
              設定
            </Button>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md"
          >
            ログアウト
          </button>
        </>
      ) : (
        <>
          <Link href="/login">
            <Button variant="default" className="px-3 py-2 md:py-3">
              ログイン
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary" className="px-3 py-2 md:py-3">
              ユーザー登録
            </Button>
          </Link>
        </>
      )}
    </nav>
  );
}
