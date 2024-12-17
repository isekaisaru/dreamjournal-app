"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { set } from 'date-fns';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { setIsLoggedIn } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`, { email,password});

      if (!response.data.token) {
        setError('トークンが取得されませんでした。');
        return;
      }
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      router.push('/home');
    } catch (error: any) {
      setError('ログインに失敗しました。もう一度お試しください。');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-500 px-4 sm:px-6 lg:px-8">
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 md:p-10 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl md:text-3xl font-semibold  mb-4 md:mb-6 text-center text-gray-800">ログイン</h2>
        <div className="space-y-4">
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
            required
            aria-label="メールアドレス"
            aria-required="true"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="current-password"
            required
            aria-label="パスワード"
            aria-required="true"
            aria-invalid={error ? "true" : "false" }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-blue-700 transition-colors duration-200 ease-in-out">ログイン</button>
        </div>
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </form>
    </div>
  );
}