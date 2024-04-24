import { User,Dream } from "./types";
import { notFound } from "next/navigation";

export const getAllDreams = async (): Promise<Dream[]> => {
   try {
     const res = await fetch(`http://localhost:3001/dreams`, { cache: "no-store"});
     if (!res.ok) {
       throw new Error(`Failed to fetch dreams: HTTP error, status = ${res.status}`);
     }
     const dreams = await res.json();
     return dreams;
   } catch (error) {
     console.error("Failed to fetch dreams:", error);
     throw error; 
   }
 };

export const getDetailDream = async (id: string): Promise<Dream> => {
   try {
     const res = await fetch(`http://localhost:3001/dreams/${id}`);
     if (res.status === 400) {
       throw new Error("Request failed with status 400: Bad Request");
     }
     if (!res.ok) {
       throw new Error(`Failed to fetch dream details: HTTP error, status = ${res.status}`);
     }
     const dream = await res.json();
     return dream;
   } catch (error) {
     console.error("Failed to fetch dream details:", error);
     throw error; 
   }
 };

 export const createDream = async (
   title: string,
   description: string
 ): Promise<Dream> => {
   const currentDatetime = new Date().toISOString();
   try {
     const res = await fetch(`http://localhost:3001/dreams`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify({ dream: {title, description }}),
     });
     if (!res.ok) {
       const errorData = await res.json();
       throw new Error(`Failed to create a new dream: HTTP error, status = ${res.status}`);
     }
     const newDream = await res.json();
     return newDream;
   } catch (error) {
     console.error("Failed to create a new dream:", error);
     throw error; 
   }
 };
 export const deleteDream = async (id:string): Promise<Dream> => {
    const res = await fetch(`http://localhost:3001/dreams/${id}`, {
      method: "DELETE",
    });
    
    if (!res.ok) {
      throw new Error("エラーが発生しました。");
    }
    const deleteDream = await res.json();
    return deleteDream;
};