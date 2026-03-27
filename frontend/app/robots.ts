import type { MetadataRoute } from "next";

const siteUrl = "https://dreamjournal-app.vercel.app";

/**
 * robots.txt を自動生成する
 * Google への案内板：「ここは見ていいよ、ここは裏方だから見ないでね」
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",      // API エンドポイントはクロールさせない
          "/home/",     // ログイン後のページはクロールさせない
          "/dream/",    // ユーザーの夢データはクロールさせない
          "/settings/", // 設定ページはクロールさせない
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
