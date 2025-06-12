import React from "react";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-8">
      <div className="p-8 rounded-lg shadow-md text-center bg-card text-card-foreground border border-border max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">
          404
        </h1>
        <p className="text-muted-foreground">ページが見つかりませんでした。</p>
      </div>
    </div>
  );
};

export default NotFound;
