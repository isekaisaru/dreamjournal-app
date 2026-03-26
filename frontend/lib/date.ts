const JST_TIME_ZONE = "Asia/Tokyo";

export function getJSTDateStr(dateInput: string | Date): string {
  return new Date(dateInput).toLocaleDateString("en-CA", {
    timeZone: JST_TIME_ZONE,
  });
}

export function getJSTYearMonthKey(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const year = date.toLocaleString("ja-JP", {
    year: "numeric",
    timeZone: JST_TIME_ZONE,
  });
  const month = date.toLocaleString("ja-JP", {
    month: "2-digit",
    timeZone: JST_TIME_ZONE,
  });

  return `${year}-${month}`;
}
