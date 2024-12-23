"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter(); 

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    router.push('/login');
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
              <Button  className="ml-4 bg-green-400 px-3 py-2 md:px-3 md:py-3 routed-md text-white">わたしの夢</Button>
            </Link>
            <button onClick={handleLogout} className="ml-4 bg-red-500 text-white px-3 py-2 rounded-md">
              ログアウト
            </button>
            </>
          ) : (
            <Link href="/login">
             <Button className="bg-purple-400 px-3 py-2 md:py-3 rounded-md">ログイン</Button> 
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;