"use client"

import { deleteDream } from '@/app/dreamsAPI';
import { useRouter } from 'next/navigation';
import React from 'react'

type DeleteButtonProps = {
  id: string;
};

const DeleteButton = ({ id }: DeleteButtonProps) => {
  const router = useRouter();

  const handleDelete = async () => {
    await deleteDream(id);

    router.push("/");
    router.refresh();
  }
  return (
    <button 
      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md cusor-pointer transition-all duration-300 ease-in-out"
         onClick={handleDelete}>
      削除
    </button>
  );
};

export default DeleteButton