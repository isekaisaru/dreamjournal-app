import fs from "node:fs";
import path from "node:path";
import { AUTH_VERIFY_PATH_PREFIXES } from "@/context/AuthContext";
import { PROTECTED_PAGE_PREFIXES } from "@/lib/protectedRoutes";
import { NON_INDEXABLE_PATH_PREFIXES } from "@/lib/site";

describe("認証ゲート登録: /room", () => {
  it("AuthContext.AUTH_VERIFY_PATH_PREFIXES に /room が含まれる", () => {
    expect(AUTH_VERIFY_PATH_PREFIXES).toContain("/room");
  });

  it("lib/protectedRoutes.PROTECTED_PAGE_PREFIXES に /room が含まれる", () => {
    expect(PROTECTED_PAGE_PREFIXES).toContain("/room");
  });

  it("lib/site.NON_INDEXABLE_PATH_PREFIXES に /room が含まれる", () => {
    expect(NON_INDEXABLE_PATH_PREFIXES).toContain("/room");
  });

  it("proxy.ts の config.matcher に /room/:path* が含まれる", () => {
    const proxySource = fs.readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");
    const matcherSource = proxySource.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1];

    expect(matcherSource).toBeDefined();
    expect(matcherSource).toContain('"/room/:path*"');
  });
});
