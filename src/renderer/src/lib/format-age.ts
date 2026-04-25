const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const fmtAge = (msAgo: number | null | undefined): string => {
  if (msAgo == null || msAgo < 0) {
    return "—";
  }
  if (msAgo < 5 * SEC) {
    return "just now";
  }
  if (msAgo < MIN) {
    return `${Math.floor(msAgo / SEC)}s ago`;
  }
  if (msAgo < HOUR) {
    return `${Math.floor(msAgo / MIN)}m ago`;
  }
  if (msAgo < DAY) {
    return `${Math.floor(msAgo / HOUR)}h ago`;
  }
  return `${Math.floor(msAgo / DAY)}d ago`;
};
