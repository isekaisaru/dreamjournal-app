"use client";

import React from "react";

const ErrorComponent = ({ reset }: { reset: () => void }) => {
  return (
    <div className="bg-destructive/10 border-l-4 border-destructive text-destructive-foreground mt-4 rounded shadow-md mx-auto p-4 max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
      <h3 className="font-bold mb-2 text-destructive">エラーが発生しました。</h3>
      <button
        onClick={() => reset()}
        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded transition duration-200"
      >
        もう一度試す
      </button>
    </div>
  );
};

export default ErrorComponent;
