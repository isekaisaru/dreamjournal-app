"use client";

import { deleteDream } from '@/app/dreamsAPI';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

type DeleteButtonProps = {
  id: string;
  className?: string;
};

const DeleteButton = ({ id }: DeleteButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDream(id);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error('Failed to delete the dream:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition-all duration-300 ease-in-out shadow-md ${
        isDeleting ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? '削除中…' : '削除'}
    </button>
  );
};

export default DeleteButton;