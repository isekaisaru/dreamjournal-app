import React from "react";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";
import { Suspense } from "react";
import Loading from "./loading";
import { Providers } from "./providers";
import PendingDreamsMonitor from "./components/PendingDreamsMonitor";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "夢の記録アプリケーション",
  description: "夢を記録するためのアプリケーションです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="ja" className="dark min-h-full">
      <body
        className={`${notoSansJP.className} px-4 sm:px-6 lg:px-8 flex flex-col min-h-screen`}
      >
        <Providers>
          <Header />
          <div className="flex flex-col flex-grow">
            <main className="flex-grow">
              <Suspense fallback={<Loading />}>{children}</Suspense>
            </main>
            <Footer />
            {/* 全体で1つのインスタンスとしてマウント */}
          </div>
          <PendingDreamsMonitor />
        </Providers>
      </body>
    </html>
  );
}
