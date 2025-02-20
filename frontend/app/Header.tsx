"use client";

import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const Header = () => {
  const { isLoggedIn, setIsLoggedIn } = useAuth();
  const router = useRouter();

  // ログアウト処理
  const handleLogout = async () => {
    localStorage.removeItem("token"); //トークンを削除
    setIsLoggedIn(false); // ログイン状態をfalseに設定
    router.refresh(); // ページをリフレッシュ
  };

  return (
    <header className="py-5 px-4 sm:px-6 md:px-10 border-b flex flex-col sm:flex-row justify-between items-center">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          <Link href="/">ユメログ</Link>
        </h1>
      </div>
      <div>
        <nav className="text-sm font-medium">
          {isLoggedIn ? (
            <>
              <Link href="/dream/new">
                <Button className="bg-purple-400 px-3 py-2 md:px-3 md:py-3 rounded-md">
                  夢の記録
                </Button>
              </Link>
              <Link href="/my-dreams">
                <Button className="ml-4 bg-green-400 px-3 py-2 md:px-3 md:py-3 rounded-md text-white">
                  わたしの夢
                </Button>
              </Link>
              <Link href="/settings">
                <Button className="ml-4 bg-blue-400 px-3 py-2 md:px-3 md:py-3 rounded-md text-white">
                  設定
                </Button>
              </Link>
              <button
                onClick={handleLogout}
                className="ml-4 bg-red-500 text-white px-3 py-2 rounded-md"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button className="bg-purple-400 px-3 py-2 md:py-3 rounded-md">
                  ログイン
                </Button>
              </Link>
              <Link href="/register">
                <Button className="ml-4 bg-green-400 px-3 py-2 md:py-3 rounded-md">
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
