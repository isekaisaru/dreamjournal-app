import { Dream } from '@/app/types';
import Link from 'next/link';
import React from 'react';
import DreamCard from './DreamCard';

type DreamListProps = {
   dreams: Dream[];
};

const DreamList = ({ dreams }: DreamListProps) => {
  return (
    <div>
      {dreams.map((dream) => (
        <DreamCard dream={dream} key={dream.id} />
       ))}  

    </div>
  );
};

export default DreamList;