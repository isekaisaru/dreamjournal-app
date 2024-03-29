import { Button } from '@/components/ui/button';
import Link from 'next/link';
import React from 'react'

const Header = () => {
  return (
    <header className="py-5 px-10 border-b flex justify-between items-center"> 
      <div>
        <h1 className="text-4xl font-extrabold">
          <Link href="/">ユメログ</Link></h1>
        </div>
        <div>
          <nav className="text-sm font-medium">
            <Link href="/dream/new"
            ><Button className="bg-purple-400 px-3 py-3 rounded-md">夢の記録</Button></Link>
          </nav>
        </div>
        </header>
 
  );
};

export default Header