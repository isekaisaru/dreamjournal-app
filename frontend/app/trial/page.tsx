"use client";

import apiClient from "@/lib/apiClient";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { User } from "@/app/types";

export default function TrialPage() {
  const [dreams, setDreams] = useState<
    { title: string; description: string }[]
  >([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // エラーメッセージ用の状態
  const { isLoggedIn, login, userId } = useAuth();
  const router = useRouter();

  // トライアルユーザーの作成
  const createTrialUser = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      if (!apiUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not defined");
      }

      // トライアルユーザーのデータを送信
      const response = await apiClient.post<{ user: User }>(
        "/auth/trial_login",
        {
          trial_user: {
            username: `Test User ${Date.now()}`,
            email: "test@example.com",
            password: "password123",
            password_confirmation: "password123",
          },
        }
      );
      const userData = response.user;
      if (userData) {
        // login関数はidがstringであることを期待しているため、変換します
        login({
          ...userData,
          id: String(userData.id),
        });
      } else {
        throw new Error(
          "トライアルユーザー作成時のレスポンスに必要なデータが含まれていません。"
        );
      }
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("トライアルユーザーの作成に失敗しました。");
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

  useEffect(() => {
    if (isLoggedIn === true) {
      router.push("/home");
    }
  }, [isLoggedIn, router]);

  return (
    <div className="container mx-auto p-4 bg-background text-foreground">
      <button
        onClick={createTrialUser}
        className="bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90"
      >
        Create Trial User
      </button>

      {/* エラーメッセージがある場合は表示 */}
      {errorMessage && <p className="text-destructive mt-4">{errorMessage}</p>}

      {/* ユーザーが作成された場合 */}
      {userId && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4 text-foreground">夢の記録</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addDream();
            }}
            className="mb-6 bg-card p-6 rounded-lg border border-border"
          >
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-card-foreground"
              >
                夢のタイトル:
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:text-sm"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-card-foreground"
              >
                夢の内容:
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 border border-input bg-background text-foreground px-3 py-2 rounded-md focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90"
            >
              夢を記録する
            </button>
          </form>

          <h3 className="text-xl font-semibold mb-2 text-foreground">
            記録された夢
          </h3>
          <ul className="list-disc pl-5">
            {dreams.map((dream, index) => (
              <li key={index} className="mb-2">
                <h4 className="text-lg font-bold text-foreground">
                  {dream.title}
                </h4>
                <p className="text-muted-foreground">{dream.description}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
