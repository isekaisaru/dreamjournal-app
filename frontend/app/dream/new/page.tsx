"use client";

import { createDream } from '@/app/dreamsAPI';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';


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
    setLoading(false);
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
          <label className="text-gray-700 text-sm font-bold mb-2" htmlFor="title">夢のタイトル</label>
          <input
            id="title"
            type="text"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
          />
        </div>
        <div className='mb-4'>
          <label className="text-gray-700 text-sm font-bold mb-2" htmlFor="description">夢の内容</label>
          <textarea
            id="description"
            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            >
          </textarea>
        </div>
        <button type="submit"
         className={`py-2 px-4 border rounded-md ${
           loading
             ? " bg-purple-300 cursor-not-allowed"
             : " bg-purple-400 hover:bg-purple-500"
         } transition-colors duration-200 ease-in-out` }
         disabled={loading}
         >記録する
         </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default DreamJournalPage;