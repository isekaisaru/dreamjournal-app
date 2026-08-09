import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_URL, NON_INDEXABLE_PATH_PREFIXES } from "@/lib/site";

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------
describe("robots", () => {
  const result = robots();
  const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
  const disallow = ([] as string[]).concat(rule?.disallow ?? []);

  it("公開トップを許可する", () => {
    expect(rule?.allow).toBe("/");
  });

  it.each(NON_INDEXABLE_PATH_PREFIXES)(
    "認証・裏方パス %s をクロール除外する",
    (path) => {
      expect(disallow).toContain(path);
    }
  );

  it("sitemap を絶対URLで指す", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------
describe("sitemap", () => {
  const entries = sitemap();
  const urls = entries.map((e) => e.url);

  it("公開ページのみを含み、認証ページを含まない", () => {
    for (const url of urls) {
      const path = url.replace(SITE_URL, "") || "/";
      const isNonIndexable = NON_INDEXABLE_PATH_PREFIXES.some((prefix) =>
        path.startsWith(prefix)
      );
      expect(isNonIndexable).toBe(false);
    }
  });

  it("全URLが本番ベースURLで始まる", () => {
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
    }
  });

  it("トップページを含む", () => {
    expect(urls).toContain(SITE_URL);
  });
});
