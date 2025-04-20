"use client";

import React, { useState } from "react";

type DeleteButtonProps = {
  id: number;
  onClick: () => void;
  className?: string;
};

const DeleteButton = ({ id, onClick, className }: DeleteButtonProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClick = async () => {
    setIsDeleting(true);
    try {
      await onClick();
    } catch (error) {
      console.error("Error during delete operation:", error);
      alert("削除中にエラーが発生しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition-all duration-300 ease-in-out shadow-md ${
        isDeleting ? "opacity-50 cursor-not-allowed" : ""
      } ${className || ""}`}
      onClick={handleClick}
      disabled={isDeleting}
    >
      {isDeleting ? "削除中…" : "削除"}
    </button>
  );
};

export default DeleteButton;
