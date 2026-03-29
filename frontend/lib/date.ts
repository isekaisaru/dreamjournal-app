const JST_TIME_ZONE = "Asia/Tokyo";

export function getJSTDateStr(dateInput: string | Date): string {
  return new Date(dateInput).toLocaleDateString("en-CA", {
    timeZone: JST_TIME_ZONE,
  });
}

export function getJSTYearMonthKey(dateInput: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: JST_TIME_ZONE,
  }).formatToParts(new Date(dateInput));

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Failed to format JST year-month key");
  }

  return `${year}-${month}`;
}
