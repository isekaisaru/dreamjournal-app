"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { clientLogout } from "@/lib/apiClient";
import { toast } from "@/lib/toast";

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
      toast.error(error.message || "ログアウトに失敗しました。");
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
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="px-3 py-2 md:px-3 md:py-3"
          >
            ログアウト
          </Button>
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
