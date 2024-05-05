"use client"

import { getDetailDream, updateDream } from '@/app/dreamsAPI';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'

type UpdateButtonProps = {
  id: string;
  initialTitle: string;
  initialDescription: string;
};

const UpdateButton = ({ id, initialTitle, initialDescription }: UpdateButtonProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const router = useRouter();

  const handleUpdate = async () => {
    try {
      const updated = await updateDream(id,title, description);
      if(updated) {
      const freshData = await getDetailDream(id);
      setTitle(freshData.title);
      setDescription(freshData.description);
      setTimeout(() => {
      router.push("/"); 
      router.refresh();
      }, 100);
      }
    } catch (error) {
      console.error('Failed to update the dream:', error);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-12">
    <label className="text-gray-700 text-sm font-bold mb-2">夢のタイトル</label>
    <input type="text" 
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
      value={title} 
      onChange={(e) => setTitle(e.target.value)} 
      placeholder="Title" 
    />
    <textarea 
      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
      value={description} 
      onChange={(e) => setDescription(e.target.value)} 
      placeholder="Description"
    />
    <div className="bg-blue-500 hover:bg-blue-600 rounded-md py-2 px-5 inline cursor-pointer"
      onClick={handleUpdate}>
      更新
    </div>
  </div>
);
};

export default UpdateButton;