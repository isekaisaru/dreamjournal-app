import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react'

const Header = () => {
  return (
    <header className="py-5 px-4 sm:px-6 md:px-10 border-b flex flex-col sm:flex-row justify-between items-center">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-2xl md:text-4xl font-extrabold">
          <Link href="/">ユメログ</Link>
        </h1>
      </div>
      <div>
        <nav className="text-sm font-medium">
          <Link href="/dream/new">
            <Button className="bg-purple-400 px-3 py-2 md:px-3 md:py-3 rounded-md">夢の記録</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;