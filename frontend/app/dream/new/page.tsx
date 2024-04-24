"use client";

import { createDream } from '@/app/dreamsAPI';
import { Coming_Soon } from 'next/font/google';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'


const DreamJournalPage= () => {
  const router = useRouter();
  const [title, setTitle] = useState<string>("")
  const [description, setDescription] = useState<string>("")
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
   try {
    await createDream(title,description);

    setLoading(false);
    router.push("/");
    router.refresh();
   } catch (err) {
     setError("投稿に失敗しました");
   }
  };


  return (
    <div className="min-h-screen py-8 px-4 md:px-12">
      <h2 className="text-2xl font-bold mb-4">今日の夢の記録</h2>
      <form
        className="bg-slate-200 p-6 rounded shadow-lg"
        onSubmit={handleSubmit}
        >
        <div className='mb-4'>
          <label className="text-gray-700 text-sm font-bold mb-2">夢のタイトル</label>
          <input
            type="text"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight foucus:outline-none"
            onChange={(e) => setTitle(e.target.value)}/>
        </div>
        <div className='mb-4'>
          <label className="text-gray-700 text-sm font-bold mb-2">夢の内容</label>
          <textarea
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight foucus:outline-none"
            onChange={(e) => setDescription(e.target.value)}>
          </textarea>
        </div>
        <button type="submit"
         className={`py-2 px-4 border rounded-md ${
           loading
             ? " bg-purple-300 cursor-not-allowed"
             : " bg-purple-400 hover:bg-purple-500"
         }` }
         disabled={loading}
         >記録する
         </button>
      </form>
    </div>
  );
};

export default DreamJournalPage