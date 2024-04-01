import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import Header from "./Header";
import Footer from "./Footer";

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
    <html lang="ja">
      <body className={"container mx-auto  bg-sky-600 text-slate-50 ${notoSansJP.className}"}>
        <Header />
        {children}
        <Footer />
        </body>
    </html>
  );
}
