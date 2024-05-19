"use client";

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email || !username || !password || !passwordConfirmation ) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    if(password !== passwordConfirmation) {
      setError('パスワードが一致しません。');
      return;
    }
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        email,
        username,
        password,
        password_confirmation: passwordConfirmation
      });

      localStorage.setItem('token', response.data.token);
      console.log('Registration successful:', response.data);
      router.push('/login');
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data.errors.join(', '));
      } else {
        setError('登録に失敗しました。もう一度お試しください。');
      }
      console.error('Registration error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
      />
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="ユーザー名"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="パスワード"
        required
      />
      <input
        type="password"
        value={passwordConfirmation}
        onChange={(e) => setPasswordConfirmation(e.target.value)}
        placeholder="パスワード確認"
        required
      />
      <button type="submit">登録</button>
      {error && <p>{error}</p>}
    </form>
  );
}