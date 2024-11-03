"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter(); 

  useEffect(() => {
    // トークンの存在を確認してログイン状態を設定する関数
    const checkToken = () => {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token); // トークンがあればログイン状態にする
    };
    
    checkToken(); // 初回チェック

    // ローカルストレージの変更を監視してログイン状態を更新
    window.addEventListener('storage', checkToken);
    
    // コンポーネントのアンマウント時にイベントリスナーを削除
    return () => {
      window.removeEventListener('storage', checkToken);
    };
  }, []);

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('token'); //ログイントークンを削除
    setIsLoggedIn(false); // ログイン状態をfalseに設定
    router.push('/'); // ホームページに移動
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
            <Button className="bg-purple-400 px-3 py-2 md:px-3 md:py-3 rounded-md">夢の記録</Button>
            </Link>
            <Link href= "/my-dreams">
              <Button  className="ml-4 bg-green-400 px-3 py-2 md:px-3 md:py-3 rounded-md text-white">わたしの夢</Button>
            </Link>
            <Link href="/settings">
            <Button className="ml-4 bg-blue-400 px-3 py-2 md:px-3 md:py-3 rounded-md text-white">設定</Button>
            </Link>
            <button onClick={handleLogout} className="ml-4 bg-red-500 text-white px-3 py-2 rounded-md">
              ログアウト
            </button>
            </>
          ) : (
            <>
            <Link href="/login">
             <Button className="bg-purple-400 px-3 py-2 md:py-3 rounded-md">ログイン</Button> 
            </Link>
            <Link href="/register">{/* ユーザー登録リンク */}
              <Button className="ml-4 bg-green-400 px-3 py-2 md:py-3 rounded-md">ユーザー登録</Button>
            </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;