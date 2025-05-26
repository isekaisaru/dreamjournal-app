"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Loading from "../loading";

const SettingsPage = () => {
  const { isLoggedIn, userId, logout, deleteUser } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態を管理
  const [isDeleting, setIsDeleting] = useState(false); // 削除中の状態を管理

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (userId) {
        await deleteUser();
        alert("アカウントは削除されました。");
        logout();
        router.push("/");
      } else {
        console.error("ユーザーIDが見つかりません。");
      }
    } catch (error) {
      console.error("ユーザー削除に失敗しました。", error);
      alert(
        "アカウントの削除に失敗しました。 しばらくしてから実行してください。"
      );
    } finally {
      setIsDeleting(false);
    }
  };
  if (isLoggedIn === null) {
    return <Loading />;
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-r from-blue-100 to-blue-300">
      <h2 className="text-4xl font-bold mb-6">設定ページ</h2>

      <button
        className="bg-red-500 text-white font-bold px-4 py-2 rounded"
        onClick={() => setIsModalOpen(true)}
      >
        アカウントを削除
      </button>

      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="modal-content bg-white p-6 rounded shadow-lg w-full sm:w-96">
            <p className="text-lg font-bold mb-4 text-red-600 bg-yellow-50 p-4 rounded-lg border border-red-500">
              本当にアカウントを削除しますか？ この操作は取り消せません。
            </p>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors duration-200"
                onClick={() => setIsModalOpen(false)}
              >
                キャンセル
              </button>
              <button
                className={`bg-red-500 text-white px-4 py-2 rounded ${
                  isDeleting
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-red-600"
                } transition-colors duration-200`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "削除中…" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SettingsPage;
