"use client";

import { useDream } from "../../../hooks/useDream";
import { usePathname } from "next/navigation";
import DeleteButton from "@/components/DeleteButton";
import UpdateButton from "@/components/UpdateButton";
import { useState } from "react";


// スピナー用のコンポーネント
const Spinner = () => {
  return (
    <div className="flex justify-center items-center h-24">
      <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
    </div>
  );
};

const DreamPage = () => {
  const pathname = usePathname();
  const id = pathname.split("/").pop(); // パスからIDを取得
  const { dream, error, isUpdating, updateDreamData } = useDream(id as string);
  const [isEditing, setIsEditing] = useState(false);

  
  // 更新ボタンがクリックされたときの処理
  const handleUpdateClick = () => {
    setIsEditing(!isEditing); 
  };



  // ロード中のスピナー表示
  if (!dream && !error) {
    return <Spinner />;
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-12 bg-gradient-to-r from-blue-100 to-blue-300">
      <div className="bg-white p-6 rounded shadow-lg max-w-2xl mx-auto">
        <h2 className="text-4xl font-bold mb-4 text-gray-800">
          {isEditing ? "夢を編集" : dream?.title}
        </h2>

        {error && (
          <p className="text-red-500 text-center mb-4">
            {error}
          </p>
        )}

        {isEditing && dream ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateDreamData(dream.title, dream.description);
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
                value={dream.title}
                onChange={(e) =>
                  updateDreamData(e.target.value, dream.description)
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
                value={dream.description}
                onChange={(e) =>
                  updateDreamData(dream.title, e.target.value)
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
              {dream?.description}
            </p>
            <div className="flex justify-between">
              <DeleteButton id={dream?.id || ""} />
              <UpdateButton onClick={handleUpdateClick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DreamPage;
