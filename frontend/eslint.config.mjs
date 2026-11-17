// ESLint 9 の設定（flat config）。実行: yarn lint
//
// 第1段階の方針:
// - TypeScript のソース（.ts / .tsx）を調べる。エラーが 1 件でもあれば CI を失敗させる。
// - 整形（Prettier）は ESLint に載せず、`yarn format` で別に扱う。
//   既存コードの整形の差が大きいため、開いている PR が片づいてから一括で整える。
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const TS_FILES = ["**/*.{ts,tsx}"];

// まだ導入していないプラグインのルール名。
// 既存の `eslint-disable-next-line react-hooks/exhaustive-deps` などのコメントが
// 「知らないルール」としてエラーにならないよう、名前だけ登録する（何も検査しない）。
// eslint-plugin-react-hooks を導入するときに、この定義を本物に置き換える。
const notInstalledYet = { meta: { schema: [] }, create: () => ({}) };

const config = [
  {
    // 自動で作られるファイルと、設定用の JavaScript は調べない
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "public/**",
      "next-env.d.ts",
      "**/*.{js,mjs,cjs}",
    ],
  },
  { ...js.configs.recommended, files: TS_FILES },
  ...tsPlugin.configs["flat/recommended"].map((entry) => ({
    ...entry,
    files: TS_FILES,
  })),
  {
    files: TS_FILES,
    plugins: {
      "react-hooks": { rules: { "exhaustive-deps": notInstalledYet } },
      react: { rules: { "display-name": notInstalledYet } },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],
      "@typescript-eslint/no-explicit-any": "off",
      // 正規表現の不要な `\`。動作は変わらないので、警告にとどめる
      "no-useless-escape": "warn",
    },
  },
  {
    // Jest のモックでは require() を使う書き方が一般的なので、テストでは許可する
    files: ["__tests__/**/*.{ts,tsx}", "jest.setup.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
