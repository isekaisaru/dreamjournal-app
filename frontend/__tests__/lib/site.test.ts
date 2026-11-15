import { SUPPORT_EMAIL } from "@/lib/site";

// 特定商取引法の表記では、販売事業者の情報を「請求があれば開示」にしているため、
// 請求を受け付ける問い合わせ先が実在することが前提になる。
// 問い合わせ先が空・架空のまま公開されないよう、ここで止める。
describe("SUPPORT_EMAIL（問い合わせ先）", () => {
  it("メールアドレスの形をしている", () => {
    expect(SUPPORT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it("架空のドメイン（example.com など）ではない", () => {
    expect(SUPPORT_EMAIL).not.toMatch(/@(.+\.)?example\.(com|org|net)$/i);
  });
});
