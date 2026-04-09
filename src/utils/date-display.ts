export function formatExportedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDateOnly(date);
}

export function formatDateOnly(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(value);
}

export function formatConversationRange(
  timestamps: Array<string | undefined>
): string | null {
  const dates = timestamps
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length === 0) {
    return null;
  }

  const start = dates[0];
  const end = dates[dates.length - 1];
  const sameDay = isSameDay(start, end);

  if (sameDay) {
    return formatDateOnly(start);
  }

  return `${formatExportedAt(start.toISOString())} to ${formatExportedAt(end.toISOString())}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
