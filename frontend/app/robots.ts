import type { MetadataRoute } from "next";
import { SITE_URL, NON_INDEXABLE_PATH_PREFIXES } from "@/lib/site";

/**
 * robots.txt を自動生成する
 * Google への案内板：「ここは見ていいよ、ここは裏方だから見ないでね」
 *
 * クロール除外パスは lib/site.ts の NON_INDEXABLE_PATH_PREFIXES に一元管理し、
 * 認証ページを追加したときに robots と sitemap の両方で取りこぼさないようにする。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...NON_INDEXABLE_PATH_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
