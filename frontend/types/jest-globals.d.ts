import type * as JestGlobals from "@jest/globals";

declare global {
  const afterAll: typeof JestGlobals.afterAll;
  const afterEach: typeof JestGlobals.afterEach;
  const beforeAll: typeof JestGlobals.beforeAll;
  const beforeEach: typeof JestGlobals.beforeEach;
  const describe: typeof JestGlobals.describe;
  const expect: typeof JestGlobals.expect;
  const it: typeof JestGlobals.it;
  const jest: typeof JestGlobals.jest;
  const test: typeof JestGlobals.test;

  // `typeof` で取り込めるのは値の `jest` だけなので、テストで使う型の名前
  // （jest.Mock など）を @jest/globals から写す。型引数を省いたときは、
  // 以前の @types/jest と同じく引数・戻り値を any として扱う。
  namespace jest {
    type Mock<T extends (...args: any) => any = (...args: any) => any> =
      JestGlobals.jest.Mock<T>;
    type MockedFunction<T extends (...args: any) => any> =
      JestGlobals.jest.MockedFunction<T>;
    type SpyInstance<T extends (...args: any) => any = (...args: any) => any> =
      JestGlobals.jest.SpiedFunction<T>;
  }
}

export {};
