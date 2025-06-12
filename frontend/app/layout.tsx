import React from "react";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import { Suspense } from "react";
import Loading from "./loading";
import { AuthProvider } from "../context/AuthContext";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "夢の記録アプリケーション",
  description: "夢を記録するためのアプリケーションです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="min-h-full">
      <body className={`${notoSansJP.className} px-4 sm:px-6 lg:px-8 flex flex-col min-h-screen`}>
        <AuthProvider>
          <Header />
          <div className="flex flex-col flex-grow">
            <main className="flex-grow">
              <Suspense fallback={<Loading />}>{children}</Suspense>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
