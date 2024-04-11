import { Dream } from '@/app/types';
import Link from 'next/link';
import React from 'react';

type DreamListProps = {
   dreams: Dream[];
};

const DreamList = ({ dreams }: DreamListProps) => {
  return (
    <div>
      {dreams.map((dream) => (
        <div className="shadow my-4 flex flex-col" key={dream.id}>
          <Link href={`dream/${dream.id}`} className="text-slate-900 text-3xl font-bold hover:text-gray-700 pb-4">
            {dream.title}
          </Link>
          <Link href={`dream/${dream.id}`} className="text-slate-900 text-xl font-bold hover:text-gray-700 pb-4">
            {dream.description}
          </Link>
        </div>
       ))}  

    </div>
  );
};

export default DreamList;