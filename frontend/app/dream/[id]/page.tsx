"use client"; 

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation'; 
import { getDetailDream } from '@/app/dreamsAPI';
import DeleteButton from '@/components/DeleteButton';
import UpdateButton from '@/components/UpdateButton';

interface Dream {
  id: string;
  title: string;
  description: string;
}

const Dream = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = pathname.split('/').pop();
  const [detailDream, setDetailDream] = useState<Dream | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    console.log("Fetching dream with ID:", id);
    getDetailDream(id as string)
      .then((data) => {
        console.log("Received dream data:", data);
        setDetailDream(data);
      })
      .catch((err) => {
        console.error("Error fetching dream detail:", err);
        setError('夢の詳細を取得できませんでした');
      });
  }, [id]);

  if (error) {
    return <div>{error}</div>;
  }
  
  if (!detailDream) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-5">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl md:text-4xl  font-bold text-center mb-6">{detailDream.title}</h1>
      <div className="text-lg md:leading-relaxed  mb-8">
        <p>{detailDream.description}</p>
      </div>
      <div className="flex justify-center space-x-4">
        <DeleteButton id={detailDream.id} />
        <UpdateButton id={detailDream.id} initialTitle={detailDream.title} initialDescription={detailDream.description} />
      </div>
    </div>
    </div>
  );
};

export default Dream;