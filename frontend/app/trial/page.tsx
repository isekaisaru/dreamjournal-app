"use client";

import axios from "axios";
import { useState } from "react";

export default function TrialPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [dreams, setDreams] = useState<
    { title: string; description: string }[]
  >([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージ用の状態

  // トライアルユーザーの作成
  const createTrialUser = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not defined");
      }
      console.log("API URL:", apiUrl);

      // トライアルユーザーのデータを送信
      const response = await axios.post(`${apiUrl}/trial_users`, {
        trial_user: {
          name: "Test User",
          email: "test@example.com",
          password: "password123",
          password_confirmation: "password123",
        },
      });

      const { user_id, token } = response.data;
      localStorage.setItem("token", token); // トークンを保存
      localStorage.setItem("user_id", user_id.toString()); // ユーザーIDを保存
      setUserId(user_id); // ユーザーIDを状態に設定
      setErrorMessage(null); // エラーをリセット
    } catch (error) {
      setErrorMessage("トライアルユーザーの作成に失敗しました。");
      console.error("Error creating trial user:", error);
    }
  };

  // 夢の記録を追加する
  const addDream = () => {
    // バリデーション: タイトルと内容が空でないか確認
    if (!title || !description) {
      alert("タイトルと内容の両方を入力してください。");
      return;
    }

    // 夢の記録は7つまで
    if (dreams.length >= 7) {
      alert("夢の記録は７つまでです。");
      return;
    }

    // 新しい夢を追加し、フォームをリセット
    setDreams([...dreams, { title, description }]);
    setTitle("");
    setDescription("");
  };

  return (
    <div className="container mx-auto p-4">
      <button
        onClick={createTrialUser}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        Create Trial User
      </button>

      {/* エラーメッセージがある場合は表示 */}
      {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}

      {/* ユーザーが作成された場合 */}
      {userId && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">夢の記録</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addDream();
            }}
            className="mb-6"
          >
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                夢のタイトル:
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                夢の内容:
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 border border-gray-300 bg-white text-black px-3 py-2 rounded-md focus:ring focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-700"
            >
              夢を記録する
            </button>
          </form>

          <h3 className="text-xl font-semibold mb-2">記録された夢</h3>
          <ul className="list-disc pl-5">
            {dreams.map((dream, index) => (
              <li key={index} className="mb-2">
                <h4 className="text-lg font-bold">{dream.title}</h4>
                <p className="text-gray-700">{dream.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
