// Business-day helpers shared by quotes and orders. Everything is evaluated in
// the Asia/Shanghai working day so an "overdue" flag never flips halfway
// through a day just because the server clock crossed midnight UTC.

function parseShanghaiDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}${read("month")}${read("day")}`;
}

export function startOfBusinessDay(date = new Date()) {
  const dayPart = parseShanghaiDateParts(date);
  return new Date(`${dayPart.slice(0, 4)}-${dayPart.slice(4, 6)}-${dayPart.slice(6, 8)}T00:00:00+08:00`);
}

export function shanghaiDateStamp(date = new Date()) {
  return parseShanghaiDateParts(date);
}

export function formatShanghaiDate(date: Date) {
  const dayPart = parseShanghaiDateParts(date);
  return `${dayPart.slice(0, 4)}-${dayPart.slice(4, 6)}-${dayPart.slice(6, 8)}`;
}
