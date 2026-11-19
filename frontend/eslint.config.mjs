// ESLint 9 の設定（flat config）。実行: yarn lint
//
// 第1段階の方針:
// - TypeScript のソース（.ts / .tsx）を調べる。エラーか警告が 1 件でもあれば CI を失敗させる
//   （package.json の lint に --max-warnings 0）。
// - 整形（Prettier）は ESLint に載せず、`yarn format` で別に扱う。
//   既存コードの整形の差が大きいため、開いている PR が片づいてから一括で整える。
import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const TS_FILES = ["**/*.{ts,tsx}"];

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
    rules: {
      "no-console": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          // `_` で始まる名前は「わざと使わない」印として許す
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          // テストのモックで、一部の props を取り除くために分割代入する書き方を許す
          ignoreRestSiblings: true,
        },
      ],
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
