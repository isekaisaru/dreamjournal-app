import React from "react";

type UpdateButtonProps = {
  onClick: () => void; // 更新ボタンがクリックした際に発火する関数を受け取る
};

const UpdateButton: React.FC<UpdateButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition-all duration-300 ease-in-out shadow-md"
    >
      更新
    </button>
  );
};

export default UpdateButton;
