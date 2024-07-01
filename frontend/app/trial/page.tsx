"use client"

import { useEffect, useState } from "react";
import axios from "axios";

export default function TrialPage() {
  const [userId, setUserId] = useState<number | null>(null);

  const createTrialUser = async () => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/trial_users`);
      const { user_id, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id.toString());
      
      setUserId(user_id);
    } catch (error) {
      console.error('Error creating trial user:', error);
    }
  };

  useEffect(() => {
    createTrialUser();
  }, []);

  return (
    <div>
      <h1>お試しモードで夢を記録</h1>
      <p>お試しユーザーID: {userId}</p>
      <p>このモードでは、夢の記録を試すことができます。</p>
      <button onClick={() => window.location.href = '/register'}>今すぐ登録</button>
    </div>
  );
}