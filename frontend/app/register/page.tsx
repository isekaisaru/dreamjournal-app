"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password || !passwordConfirmation) {
      setError("すべてのフィールドを入力してください。");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("パスワードが一致しません。");
      return;
    }
    if (password.length < 6) {
      setError("パスワードは6文字以上である必要があります。");
      return;
    }
    try {
      console.log("Submitting registration data:", {
        email,
        username,
        password,
        password_confirmation: passwordConfirmation,
      });
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/register`,
        {
          user: {
            email,
            username,
            password,
            password_confirmation: passwordConfirmation,
          },
        }
      );
      // バックエンドから返されるアクセストークンとリフレッシュトークンを正しく取得
      const { access_token, refresh_token, user: userData } = response.data;
      
      if (access_token && refresh_token && userData) {
        console.log("Access Token received:", access_token);
        console.log("Refresh Token received:", refresh_token);
        console.log("User data received:", userData);

        login(access_token, refresh_token, userData);

        setMessage("登録に成功しました。ホームページに移動します...");
      } else {
        console.error("Registration response missing tokens or user data:", response.data);
        setError("登録処理中にエラーが発生しました。必要な情報がサーバーから返されませんでした。");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.response && error.response.data) {
        const backendError = error.response.data.error || error.response.data.errors;
        setError(Array.isArray(backendError) ? backendError.join(", ") : backendError || "登録に失敗しました。");
      } else if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(error.response.data.message); // 別のエラーメッセージがある場合
      } else {
        console.error("General error:", error);
        setError("登録に失敗しました。もう一度お試しください。");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-500 px-4 sm:px-6 lg:px-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center text-gray-800">
          ユーザー登録
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名"
            autoComplete="username"
            required
            aria-label="ユーザー名"
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワード"
            autoComplete="new-password"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <input
            type="password"
            name="password_confirmation"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="パスワード確認"
            autoComplete="new-password"
            required
            aria-label="パスワード確認"
            aria-required="true"
            aria-invalid={error ? "true" : "false"}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-blue-700"
          >
            登録
          </button>
        </div>
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
        {message && (
          <p className="text-green-500 mt-4 text-center">{message}</p>
        )}
      </form>
    </div>
  );
}
