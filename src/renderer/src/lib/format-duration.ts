const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const pad2 = (n: number): string => n.toString().padStart(2, "0");

export const formatDurationHours = (hours: number): string => {
  if (!Number.isFinite(hours) || hours < 0) {
    return "--";
  }
  const totalMinutes = Math.round(hours * MINUTES_PER_HOUR);
  const days = Math.floor(totalMinutes / MINUTES_PER_DAY);
  const hoursLeft = Math.floor(
    (totalMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR
  );
  const minutesLeft = totalMinutes % MINUTES_PER_HOUR;
  return `${days}d:${pad2(hoursLeft)}h:${pad2(minutesLeft)}m`;
};
