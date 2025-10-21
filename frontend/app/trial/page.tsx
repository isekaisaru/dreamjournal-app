"use client";

import { useState } from "react";
import Link from "next/link";

export default function TrialPage() {
  const [dreams, setDreams] = useState<
    { title: string; description: string }[]
  >([]);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

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
    <div className="container mx-auto p-4 bg-background text-foreground">
      <div className="mb-6 p-4 bg-card border border-border rounded-lg">
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          お試し体験モード
        </h1>
        <p className="text-muted-foreground mb-4">
          登録不要で夢の記録を体験できます。ただし、ページをリロードするとデータは消えます。
        </p>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 夢を永続的に保存したい場合は、ユーザー登録が必要です
          </p>
        </div>
      </div>

      <div className="mb-6">
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
          記録された夢 ({dreams.length}/7)
        </h3>
        {dreams.length === 0 ? (
          <p className="text-muted-foreground">
            まだ夢が記録されていません。上のフォームから記録してみましょう。
          </p>
        ) : (
          <ul className="list-disc pl-5 mb-6">
            {dreams.map((dream, index) => (
              <li key={index} className="mb-2">
                <h4 className="text-lg font-bold text-foreground">
                  {dream.title}
                </h4>
                <p className="text-muted-foreground">{dream.description}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 p-4 bg-card border border-border rounded-lg text-center">
          <p className="text-foreground mb-4">
            夢を永続的に保存して、いつでも振り返りたいですか？
          </p>
          <Link
            href="/register"
            className="inline-block bg-primary text-primary-foreground py-2 px-6 rounded hover:bg-primary/90"
          >
            ユーザー登録して保存する
          </Link>
        </div>
      </div>
    </div>
  );
}
