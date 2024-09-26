"use client";

import { User, Dream } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getToken = () => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    console.log("Token:", token);
    return token;
  }
  console.error("Window is undefined, cannot retrieve token");
  return null;
};
console.log("API URL:", API_URL); 
export const getAllDreams = async (): Promise<Dream[]> => {
  try {
    console.log("API URL (getAllDreams):", API_URL);
    const res = await fetch(`${API_URL}/dreams`, {
      cache: "no-store",
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch dreams: HTTP error, status = ${res.status}`);
    }
    const dreams = await res.json();
    console.log("Received all dreams:", dreams);
    return dreams;
  } catch (error) {
    console.error("Failed to fetch dreams:", error);
    throw error;
  }
};

export const getDetailDream = async (id: string): Promise<Dream> => {
  const token = getToken();
  if (!token) {
    throw new Error('No token found');
  }
  try {
    console.log("API URL (getDetailDream):", API_URL);
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
      }
    });
    if (res.status === 400) {
      throw new Error("Request failed with status 400: Bad Request");
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch dream details: HTTP error, status = ${res.status}`);
    }
    const dream = await res.json();
    console.log("Received dream details:", dream);
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
  try {
    console.log("API URL (createDream):", API_URL);
    const res = await fetch(`${API_URL}/dreams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ dream: { title, description }}),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to create a new dream: HTTP error, status = ${res.status}`);
    }
    const newDream = await res.json();
    console.log("Created new dream:", newDream);
    return newDream;
  } catch (error) {
    console.error("Failed to create a new dream:", error);
    throw error;
  }
};

export const updateDream = async (
  id: string,
  title: string,
  description: string
): Promise<Dream> => {
  try {
    console.log("API URL (updateDream):", API_URL);
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ dream: { title, description } }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to update dream: HTTP error, status = ${res.status}, ${errorData.message}`);
    }

    const updatedDream = await res.json();
    console.log("Updated dream:", updatedDream);
    return updatedDream;
  } catch (error) {
    console.error("Failed to update dream:", error);
    throw error;
  }
};

export const deleteDream = async (id: string): Promise<void> => {

  const token = getToken();
  if (!token) {
    console.error("No tokebn available, cannot delete dream");
    return;
  }

  try {
    console.log("Deleting dream with id:", id);
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      method: "DELETE",
      headers: {
        'Authorization': `Bearer ${getToken()}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Failed to delete dream:", errorData);
      throw new Error("エラーが発生しました。");
    }
    console.log("Deleted dream with id:", id);
  } catch (error) {
    console.error("Failed to delete dream:", error);
    throw error;
  }
};