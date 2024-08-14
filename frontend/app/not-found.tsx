import React from 'react';

const NotFound = () => {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
      <div className="p-8 rounded-lg shadow-md text-center bg-white max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-800">404</h1>
        <p className="text-gray-600">ページが見つかりませんでした。</p>
      </div>
    </div>
  );
};

export default NotFound;