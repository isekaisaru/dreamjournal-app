"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getDetailDream, updateDream } from "@/app/dreamsAPI";
import DeleteButton from "@/components/DeleteButton";
import UpdateButton from "@/components/UpdateButton";


interface Dream {
  id: string;
  title: string;
  description: string;
}

// スピナー用のCSSクラス
const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-24">
      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
    </div>
  );
};

const Dream = () => {
  const pathname = usePathname();
  const router = useRouter();
  const id = pathname.split("/").pop(); // パスからIDを取得

  const [detailDream, setDetailDream] = useState<Dream | null>(null);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false); // 編集モード
  const [isUpdating, setIsUpdating] = useState(false); // 更新中の状態

  useEffect(() => {
    let isMounted = true;

    if (!id) return;

    getDetailDream(id as string)
      .then((data) => {
        if (isMounted) {
          setDetailDream(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError("夢の詳細を取得できませんでした");
        }
      });

    return () => {
      isMounted = false; // アンマウント時にフラグをfalseに
    };
  }, [id]);

  // 更新ボタンがクリックされたときの処理
  const handleUpdateClick = () => {
    setIsEditing(!isEditing); // 編集モードをトグル
    setError("");
  };

  // 更新処理
  const handleUpdate = async (newTitle: string, newDescription: string) => {
    if (newTitle.trim() === "") {
      setError("タイトルを入力してください");
      return;
    }

    if (newTitle.length > 100) {
      setError("タイトルは100文字以内で入力してください");
      return;
    }

    if (newDescription.trim() === "") {
      setError("内容を入力してください");
      return;
    }

    if (newDescription.length > 1000) {
      setError("内容は1000文字以内で入力してください");
      return;
    }

    setIsUpdating(true); // 更新中にする
    setError(""); // 既存のエラーを消す

    try {
      await updateDream(id as string, newTitle, newDescription); // 夢を更新
      router.push("/home");

    } catch (err) {
      console.error("Failed to update the dream:", error);

      if (err instanceof Error) {
         setError(err.message);
      } else {
        setError("編集に失敗しました");
      }
    } finally {
      setIsUpdating(false); // 更新が完了したので終了
    }
  };


  // ロード中のスピナー表示
  if (!detailDream && !error) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 bg-gradient-to-r from-blue-100 to-blue-300">
      <div className="bg-white p-6 rounded shadow-lg max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-4 text-gray-800">
          {isEditing ? "夢を編集" : detailDream?.title}
        </h2>

        {error && (
          <p className="text-red-500 text-center mb-4">
            {error}
          </p>
        )}

        {isEditing && detailDream ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(detailDream.title, detailDream.description);
            }}
          >
            <div className="mb-4">
              <label
                className="text-gray-700 text-sm font-bold mb-2"
                htmlFor="title"
              >
                夢のタイトル
              </label>
              <input
                type="text"
                className="shadow  border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={detailDream.title}
                onChange={(e) =>
                  setDetailDream({ ...detailDream, title: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <label
                className="text-gray-700 text-sm font-bold mb-2"
                htmlFor="description"
              >
                夢の内容
              </label>
              <textarea
                id="description"
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={detailDream.description}
                onChange={(e) =>
                  setDetailDream({
                    ...detailDream,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex justify-between mt-4">
              <button
                type="submit"
                className={`py-2 px-4 border rounded-md ${
                  isUpdating
                    ? "bg-purple-300 cursor-not-allowed"
                    : "bg-purple-400 hover:bg-purple-500"
                } transition-colors duration-200 ease-in-out`}
                disabled={isUpdating}
              >
                {isUpdating ? "更新中…" : "保存"}
              </button>
              <button
                type="button"
                className="py-2 px-4 border rounded-md bg-red-400 hover:bg-red-500 text-white"
                onClick={() => setIsEditing(false)}
              >
                キャンセル
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-lg text-gray-700 md:leading-relaxed mb-8">
              {detailDream?.description}
            </p>
            <div className="flex justify-between">
              <DeleteButton id={detailDream?.id || ""} />
              <UpdateButton onClick={handleUpdateClick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dream;
