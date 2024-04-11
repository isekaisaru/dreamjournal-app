import { User,Dream } from "./types";
import { notFound } from "next/navigation";

export const getAllDreams = async (): Promise<Dream[]> => {
   const res = await fetch(`http://localhost:3001/dreams`, { cache: "no-store"});

   const dreams = await res.json();
   return dreams;
};
export const getDetailDream = async (id: string): Promise<Dream> => {
  const res = await fetch(`http://localhost:3001/dreams/${id}`,{
   next: { revalidate: 60 },
});
 if (res.status === 400) {
  notFound();
 }
 if (!res.ok) {
  throw new Error("エラーが発生しました。");
 }

 await new Promise((resolve) => setTimeout(resolve, 1000));
 
  const dream = await res.json();
  return dream;
};