"use client";

import { useState } from 'react';
import { deleteUser } from '@/app/dreamsAPI';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';

const SettingsPage = () => {
  const { isAuthenticated, userId, logout} = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false); // モーダルの状態を管理
  const [isDeleting, setIsDeleting] = useState(false); // 削除中の状態を管理

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if(userId) { // ユーザーIDがあれば削除処理を実行
      await deleteUser(userId); // ユーザーIDをdeleteUserに渡す
      alert('アカウントは削除されました。');
      logout(); // ログアウト処理
      router.push('/');
      } else {
        console.error("ユーザーIDが見つかりません。");
      }
    } catch (error) {
      console.error('ユーザー削除に失敗しました。', error);
      alert('アカウントの削除に失敗しました。');
    } finally {
      setIsDeleting(false); // 削除完了後に状態をリセット
    }
  };

 
return (
  <div className="min-h-screen p-6 bg-gradient-to-r from-blue-100 to-blue-300">
    <h2 className="text-4xl font-bold mb-6">設定ページ</h2>

    {/* アカウント削除ボタン */}
    <button
      className="bg-red-500  text-white font-bold px-4 py-2 rounded"
      onClick={() => setIsModalOpen(true)} // モーダルを表示
    >
      アカウントを削除
    </button>

    {/* 削除モーダル */}
    {isModalOpen && (
      <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="modal-content bg-white p-6 rounded shadow-lg">
          <p className="text-lg font-bold mb-4">本当にアカウントを削除しますか？ この操作は取り消せません。</p>
          <div className="flex justify-end space-x-4 mt-4">
            {/* キャンセルボタン */}  
            <button
              className="bg-gray-500  text-white px-4 py-2 rounded"
              onClick={() => setIsModalOpen(false)} // モーダルを閉じる
            >
              キャンセル
            </button>
            {/* 削除ボタン */}
            <button
              className={`bg-red-500  text-white px-4 py-2 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleDelete} // 削除処理を実行
              disabled={isDeleting} // 削除中はボタンを無効化
            >
              {isDeleting ? '削除中…' : '削除する'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
};
export default SettingsPage;
