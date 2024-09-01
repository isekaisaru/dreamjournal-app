"use client"; 

import axios from 'axios';
import { useState } from 'react';

export default function TrialPage() {
  const [userId, setUserId] = useState<number | null>(null);

  const createTrialUser = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL is not defined');
      }
      console.log('API URL:', apiUrl);
      const response = await axios.post(`${apiUrl}/trial_users`, {
        trial_user: {
          name: "Test User",
          email: "test@example.com",
          password: "password123"
        }
      });
      const { user_id, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id.toString());
      
      setUserId(user_id);
    } catch (error) {
      console.error('Error creating trial user:', error);
    }
  };

  return (
    <div>
      <button onClick={createTrialUser}>Create Trial User</button>
      {userId && <p>User ID: {userId}</p>}
    </div>
  );
}