const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** Format an ISO timestamp as e.g. "12 minutes ago", "3 hours ago". */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  // Guard against an unparseable timestamp — Intl.RelativeTimeFormat throws
  // a RangeError on NaN, which would crash the server render.
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  return rtf.format(-diffDay, "day");
}
