const JST_TIME_ZONE = "Asia/Tokyo";

function getJSTDateParts(dateInput: string | Date): {
  year: string;
  month: string;
  day: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(dateInput));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Failed to format JST date parts");
  }

  return { year, month, day };
}

export function getJSTDateStr(dateInput: string | Date): string {
  const { year, month, day } = getJSTDateParts(dateInput);
  return `${year}-${month}-${day}`;
}

// "YYYY-MM" 形式（URLパラメータ用）を返す
export function getJSTYearMonthKey(dateInput: string | Date): string {
  const { year, month } = getJSTDateParts(dateInput);
  return `${year}-${month}`;
}
