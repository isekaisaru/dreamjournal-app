import { getDetailDream } from '@/app/dreamsAPI';
import DeleteButton from '@/components/DeleteButton';
import UpdateButton from '@/components/UpdateButton';
import React from 'react';

const Dream = async ({ params }  :{ params: { id: string} }) => {
  const detailDream = await getDetailDream(params.id);
  const handleDelete = async () => {};
  
  return (
    <div className="container mx-auto p-5">
      <h1 className="text-2xl md:text-4xl text-center mb-10 mt-10">{detailDream.title}</h1>
      <div className="text-lg md:leading-relaxed text-justify">
        <p>{detailDream.description}</p>
      </div>
      <div className="text-right mt-3 flex justify-end space-x-2">
        <DeleteButton id={detailDream.id.toString()}/>
        <UpdateButton id={detailDream.id.toString()} initialTitle={detailDream.title} initialDescription={detailDream.description} />
      </div>
    </div>
  );
};

export default Dream;