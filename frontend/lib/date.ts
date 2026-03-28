const JST_TIME_ZONE = "Asia/Tokyo";

export function getJSTDateStr(dateInput: string | Date): string {
  return new Date(dateInput).toLocaleDateString("en-CA", {
    timeZone: JST_TIME_ZONE,
  });
}

// "YYYY-MM" 形式（URLパラメータ用）を返す
// ja-JP ロケールは "2026年" / "3月" のように日本語文字を含むため使用しない
export function getJSTYearMonthKey(dateInput: string | Date): string {
  return getJSTDateStr(dateInput).slice(0, 7); // "YYYY-MM-DD" の先頭7文字
}
