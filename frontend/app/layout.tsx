import React from "react";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./components/Footer";
import { Suspense } from "react";
import Loading from "./loading";
import { Providers } from "./providers";
import PendingDreamsMonitor from "./components/PendingDreamsMonitor";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] });

const siteUrl = "https://dreamjournal-app.vercel.app";

export const metadata: Metadata = {
  title: "ユメログ | AI夢分析・夢日記アプリ",
  description:
    "毎日の夢をAIが分析。感情タグ・検索・月別アーカイブで心の変化を可視化するセルフケア・家族向けアプリ。",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "ユメログ | AI夢分析・夢日記アプリ",
    description:
      "毎日の夢をAIが分析。感情タグ・検索で心の変化を可視化するセルフケア・家族向けアプリ。",
    url: siteUrl,
    siteName: "ユメログ",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ユメログ | AI夢分析・夢日記アプリ",
    description:
      "毎日の夢をAIが分析。感情タグ・検索で心の変化を可視化するセルフケア・家族向けアプリ。",
  },
  robots: {
    index: true,
    follow: true,
  },
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
