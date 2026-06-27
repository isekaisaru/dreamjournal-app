import fs from "fs";
import path from "path";

const css = fs.readFileSync(
  path.join(__dirname, "../../app/globals.css"),
  "utf8"
);

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
