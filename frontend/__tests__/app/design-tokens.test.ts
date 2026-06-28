import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(__dirname, "../../app/globals.css"),
  "utf8"
);
const forestProfilePage = fs.readFileSync(
  path.join(__dirname, "../../app/forest/[profileId]/page.tsx"),
  "utf8"
);

function keyframesBlock(name: string): string {
  const start = css.indexOf(`@keyframes ${name}`);
  if (start < 0) return "";
  const next = css.indexOf("@keyframes", start + 1);
  return css.slice(start, next < 0 ? undefined : next);
}

describe("design tokens (#0 foundation)", () => {
  it.each([
    "--morpheus-sm:",
    "--morpheus-md:",
    "--morpheus-lg:",
    "--morpheus-hero:",
    "--glow-moon:",
    "--glow-sky:",
    "--glow-morpheus:",
    "--glow-active:",
    "--emotion-happy:",
    "--emotion-fun:",
    "--emotion-touched:",
    "--emotion-angry:",
    "--emotion-scared:",
    "--emotion-worried:",
    "--emotion-sad:",
    "--emotion-relieved:",
    "--emotion-surprised:",
    "--emotion-unknown:",
    "--sky-night:",
    "--sky-dawn:",
    "--sky-day:",
    "--sky-dusk:",
  ])("defines %s", (token) => {
    expect(css).toContain(token);
  });

  it("heroサイズはclampで可変", () => {
    expect(css).toMatch(/--morpheus-hero:\s*clamp\(/);
  });

  it("感情色: うれしい=orange / たのしい=amber（取り違え防止）", () => {
    expect(css).toMatch(/--emotion-happy:\s*#f97316/i);
    expect(css).toMatch(/--emotion-fun:\s*#f59e0b/i);
  });
});

describe("moon-pulse 後光のテーマ連動", () => {
  const block = keyframesBlock("moon-pulse");

  it("moon-pulseは--glow-activeを参照する", () => {
    expect(block).toContain("var(--glow-active)");
  });

  it("moon-pulseに固定琥珀rgba(251, 191, 36)を残さない", () => {
    expect(block).not.toMatch(/rgba\(251,\s*191,\s*36/);
  });
});

describe("forest moon pulse", () => {
  const block = keyframesBlock("forest-moon-pulse");

  it("森の月は専用アニメーションを使い、Morpheus用moon-pulseに依存しない", () => {
    expect(forestProfilePage).toContain("animate-forest-moon-pulse");
    expect(forestProfilePage).not.toContain("animate-moon-pulse");
  });

  it("森の月のpulseは既存の琥珀色の後光を維持する", () => {
    expect(block).toMatch(/rgba\(251,\s*191,\s*36,\s*0\.2\)/);
    expect(block).toMatch(/rgba\(251,\s*191,\s*36,\s*0\.45\)/);
    expect(block).toMatch(/rgba\(251,\s*191,\s*36,\s*0\.15\)/);
  });
});

describe("bottom-nav clearance (#3a)", () => {
  it("--bottom-nav-h を既定0pxで定義する", () => {
    expect(css).toMatch(/--bottom-nav-h:\s*0px/);
  });
  it("モバイルでバー表示時に --bottom-nav-h を実値化する規則がある", () => {
    expect(css).toContain("body.has-bottom-nav");
    expect(css).toMatch(/max-width:\s*767\.98px/);
  });
});
