"use client";

import { User, Dream } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 共通のトークン取得関数
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

// ユーザー情報を取得
export const fetchUserData = async (): Promise<User | null> => {
  const token = getToken();
  if (!token) {
    console.warn("トークンが見つかりません。ログインが必要です。");
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch user data: HTTP error, status = ${response.status}`);
    }
    const user = await response.json();
    console.log("Fetch user data:", user);
    return user;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    throw error;
  }
};

// すべての夢データを取得
export const getAllDreams = async (): Promise<Dream[]> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/dreams`, {
      cache: "no-store",
      headers: { 'Authorization': `Bearer ${token}` }
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

// 特定の夢データを取得
export const getDetailDream = async (id: string): Promise<Dream> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Authorization': `Bearer ${token}`,
      }
    });
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

// 新しい夢を作成
export const createDream = async (title: string, description: string): Promise<Dream> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/dreams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ dream: { title, description } }),
    });
    if (!res.ok) {
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

// 夢の情報を更新
export const updateDream = async (id: string, title: string, description: string): Promise<Dream> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ dream: { title, description } }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update dream: HTTP error, status = ${res.status}`);
    }
    const updatedDream = await res.json();
    console.log("Updated dream:", updatedDream);
    return updatedDream;
  } catch (error) {
    console.error("Failed to update dream:", error);
    throw error;
  }
};

// 特定の夢を削除
export const deleteDream = async (id: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/dreams/${id}`, {
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Failed to delete dream: HTTP error, status = ${res.status}`);
    }
    console.log("Deleted dream with id:", id);
  } catch (error) {
    console.error("Failed to delete dream:", error);
    throw error;
  }
};

// ユーザーを削除する関数
export const deleteUser = async (userId: string): Promise<void> => {
  const token = getToken();
  if (!token) throw new Error("トークンが見つかりません");

  try {
    const res = await fetch(`${API_URL}/users/${userId}`, {
      method: "DELETE",
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`ユーザー削除に失敗しました。 HTTP error, status = ${res.status}`);
    }
    console.log("Deleted user with id:", userId);
  } catch (error) {
    console.error("Failed to delete user:", error);
    throw error;
  }
};