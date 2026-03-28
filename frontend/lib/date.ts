const JST_TIME_ZONE = "Asia/Tokyo";

function getJSTDateParts(dateInput: string | Date): {
  year: string;
  month: string;
  day: string;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TIME_ZONE,
