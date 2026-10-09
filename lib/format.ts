/**
 * Formatting helpers for values the visitor reads.
 *
 * Dates are formatted by hand from a fixed English calendar instead of `toLocaleDateString`: the
 * server renders client components too, and a visitor's locale or time zone reaching the server's
 * render makes the HTML disagree with the first client render.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Milliseconds as `m:ss`, the way a recording's length is read at a glance. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Epoch millis as `9 Oct 2026, 14:32` — fixed English, so server and client render the same text. */
export function formatDateTime(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}`;
}
