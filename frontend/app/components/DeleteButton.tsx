"use client";

import React from "react";

type DeleteButtonProps = {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
};

const DeleteButton = ({ onClick, isLoading = false, className }: DeleteButtonProps) => {
  return (
    <button
      className={`bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition-all duration-300 ease-in-out shadow-md ${
        isLoading ? "opacity-50 cursor-not-allowed" : ""
      } ${className || ""}`}
      onClick={onClick}
      disabled={isLoading}
    >
      削除
    </button>
  );
};

export default DeleteButton;
