import React from 'react';
import './globals.css'

export const metadata = {
  title: 'dream-journal-app',
  description: '今日見た夢の記録を残すためのアプリケーション',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <html lang="ja">
        <body>
          <header>Test Header </header>
          <h2 className="text-4xl text-indigo-800 font-bold my-2">
            夢の記録アプリケーション
          </h2>
          { children }
        </body>
      </html>
    </>
  )
}
