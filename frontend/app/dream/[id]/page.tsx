import { getDetailDream } from '@/app/dreamsAPI';
import React from 'react'

const Dream = async ({ params }  :{ params: { id: string} }) => {
  const detailDream = await getDetailDream(params.id);
  console.log(detailDream);
  return (
    <div className="max-w-3xl mx-auto p-5">
      <h1 className="text-4xl text-center mb-10 mt-10">夢を記録します</h1>
      <div className="text-lg leading-relaxed text-justify">
        <p> 夢の記録の本文です</p>
      </div>
    </div>
  );
};

export default Dream;