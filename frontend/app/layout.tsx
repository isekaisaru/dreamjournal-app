import React from "react";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "./Header";
import Footer from "./components/Footer";
import { Suspense } from "react";
import Loading from "./loading";
import { Providers } from "./providers";
import PendingDreamsMonitor from "./components/PendingDreamsMonitor";

const notoSansJP = Noto_Sans_JP({ subsets: ["latin"] });
// Hydration前にテーマを合わせて、ライト→ダークのちらつきを防ぐ。
const themeInitScript = `
  try {
    const storedTheme = window.localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  } catch {
    document.documentElement.classList.remove("dark");
  }
`;

const siteUrl = "https://dreamjournal-app.vercel.app";

export const metadata: Metadata = {
  title: "YumeTree | モルペウスと育てるAI夢ノート",
  description:
    "YumeTree（ユメツリー）は、モルペウスと一緒に毎日の夢を記録し、AI分析・感情タグ・月別アーカイブで心の変化を見つめるAI夢ノートです。",
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.json",
  openGraph: {
    title: "YumeTree | モルペウスと育てるAI夢ノート",
    description:
      "YumeTree（ユメツリー）は、モルペウスと一緒に夢を記録し、AI分析と感情タグで心の変化を見つめるAI夢ノートです。",
    url: siteUrl,
    siteName: "YumeTree",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YumeTree | モルペウスと育てるAI夢ノート",
    description:
      "モルペウスと一緒に夢を記録し、AI分析と感情タグで心の変化を見つめるAI夢ノート。",
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
    <html lang="ja" className="min-h-full" suppressHydrationWarning>
      <body
        className={`${notoSansJP.className} px-4 sm:px-6 lg:px-8 flex flex-col min-h-screen`}
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
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
