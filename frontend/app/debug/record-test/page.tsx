import { notFound } from "next/navigation";
import RecordTestClient from "./RecordTestClient";

// 録音の不具合を調べるための開発用ページ。本番の利用者には見せない（404 にする）。
// next build は NODE_ENV=production で動くので、Vercel の本番とプレビューでも 404 になる。
export default function RecordTestPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <RecordTestClient />;
}
