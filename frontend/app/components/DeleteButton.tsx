"use client";

import React from "react";

type DeleteButtonProps = {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
};

const DeleteButton = ({
  onClick,
  isLoading = false,
  className,
}: DeleteButtonProps) => {
  return (
    <button
      className={`bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold py-2 px-4 rounded-md cursor-pointer transition-all duration-300 ease-in-out shadow-md ${
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
