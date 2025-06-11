"use client";

import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const Header = () => {
  const { isLoggedIn, logout } = useAuth();
  const router = useRouter();

  // ログアウト処理
  const handleLogout = async () => {
    await logout();
  };

  if (isLoggedIn === null) {
    return (
      <header className="py-5 px-4 sm:px-6 md:px-10 border-b border-border bg-background text-foreground flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-4xl font-extrabold">
            <Link href="/" className="text-primary hover:text-primary/90">ユメログ</Link>
          </h1>
        </div>
        <div>
          <nav className="text-sm font-medium flex space-x-4">
            <div className="h-8 w-20 bg-gray-400 rounded-md animate-pulse"></div>
            <div className="h-8 w-24 bg-gray-400 rounded-md animate-pulse"></div>
          </nav>

        </div>
      </header>
    );
  }
  
  return (
    <header className="py-5 px-4 sm:px-6 md:px-10 border-b border-border bg-background text-foreground flex flex-col sm:flex-row justify-between items-center">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          <Link href="/" className="text-primary hover:text-primary/90">ユメログ</Link>
        </h1>
      </div>
      <div>
        <nav className="text-sm font-medium flex items-center space-x-2 md:space-x-4">
          {isLoggedIn ? (
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
      </div>
    </header>
  );
};

export default Header;
