"use client";

import React from "react";

const Loading = () => {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4"
      role="status"
      aria-label="よみこんでいるよ"
    >
      <div className="h-16 w-16 rounded-full border-t-4 border-primary animate-spin"></div>
      <p className="text-sm font-medium text-muted-foreground">
        よみこんでいるよ...
      </p>
    </div>
  );
};

export default Loading;
