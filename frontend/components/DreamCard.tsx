import React from 'react'
import { Dream } from '@/app/types';
import Link from 'next/link';
import { format } from 'date-fns';

type DreamCardProps = {
  dream: Dream;
}

const DreamCard = ({ dream }: DreamCardProps) => {
  return (
    <div className="shadow my-4 flex flex-col" key={dream.id}>
          <Link href={`dream/${dream.id}`} className="text-slate-900 text-3xl font-bold hover:text-gray-700 pb-4">
            {dream.title}
          </Link>
          <p className="text-gray-600">
            {format(new Date(dream.created_at), 'yyyy-MM-dd')}
          </p>
          <Link href={`dream/${dream.id}`} className="text-slate-900 text-xl font-bold hover:text-gray-700 pb-4">
            {dream.description.length > 70 
            ? dream.description.substring(0,70) + "..."
            : dream.description}
          </Link>
          <Link href={`dream/${dream.id}`} className="text-pink-800 hover:text-black">
            続きを読む
          </Link>
        </div>
  )
};

export default DreamCard;