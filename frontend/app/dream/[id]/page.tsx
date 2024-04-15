import { getDetailDream } from '@/app/dreamsAPI';
import React from 'react'

const Dream = async ({ params }  :{ params: { id: string} }) => {
  const detailDream = await getDetailDream(params.id);
  
  return (
    <div className="max-w-3xl mx-auto p-5">
      <h1 className="text-4xl text-center mb-10 mt-10">{detailDream.title}</h1>
      <div className="text-lg leading-relaxed text-justify">
        <p>{detailDream.description}</p>
      </div>
    </div>
  );
};

export default Dream;