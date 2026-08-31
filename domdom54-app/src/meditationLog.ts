import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The meditation log: every completed sit, stored only on this device.
 *
 * The key and the entry shape used to be repeated in the player, the history
 * sheet and nowhere else - three copies of a magic string and two copies of the
 * type. Reads and writes live here now, so the totals on the Settings card and
 * the rows in the history sheet can't disagree about what a session is.
 */

export const MEDITATION_LOG_KEY = "meditationLog";

export type MeditationLogEntry = {
  timestamp: string;
  title: string;
  /**
   * Track length in seconds, as reported by the player when the sit completed.
   * Optional because entries written before the app recorded it don't have one -
   * see `entrySeconds` for how those are still counted.
   */
  durationSeconds?: number;
};

/**
 * The short and long feeds name their tracks "Transcendence (4 mins)", so a sit
 * logged before durations were recorded can still be measured from its title.
 * The medium feed doesn't follow the convention, so those older entries stay
 * unmeasured until the track is next played to the end - completion is the only
 * thing that logs a sit, and `recordCompletion` takes that opportunity to
 * backfill every past sit of the same title with the real duration.
 */
const TITLE_MINUTES = /\((\d+)\s*mins?\)/i;

/** A sit's length in seconds, or 0 if it can't be determined. */
function entrySeconds(entry: MeditationLogEntry): number {
  if (typeof entry.durationSeconds === "number" && entry.durationSeconds > 0) {
    return entry.durationSeconds;
  }
  const match = TITLE_MINUTES.exec(entry.title);
  return match ? Number(match[1]) * 60 : 0;
}

export async function loadLog(): Promise<MeditationLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEDITATION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error loading meditation log:", error);
    return [];
  }
}

export async function saveLog(log: MeditationLogEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(MEDITATION_LOG_KEY, JSON.stringify(log));
  } catch (error) {
    console.error("Error saving meditation log:", error);
  }
}

/**
 * Appends a completed sit. Also stamps the measured duration onto any earlier
 * entry for the same track that lacks one, so history recorded before the app
 * knew about durations starts counting the first time you replay that track.
 */
export async function recordCompletion(
  title: string,
  durationSeconds: number
): Promise<void> {
  const seconds =
    durationSeconds > 0 ? Math.round(durationSeconds) : undefined;

  const log = (await loadLog()).map((entry) =>
    seconds && entry.title === title && !entry.durationSeconds
      ? { ...entry, durationSeconds: seconds }
      : entry
  );

  log.push({
    timestamp: new Date().toISOString(),
    title,
    ...(seconds ? { durationSeconds: seconds } : {}),
  });

  await saveLog(log);
}

// --- Totals ---

export type MeditationTotals = {
  /** Whole minutes, calendar months in the device's local time zone. */
  thisMonth: number;
  lastMonth: number;
  allTime: number;
};

export const EMPTY_TOTALS: MeditationTotals = {
  thisMonth: 0,
  lastMonth: 0,
  allTime: 0,
};

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

export function totalsFrom(
  log: MeditationLogEntry[],
  now: Date = new Date()
): MeditationTotals {
  // Day 1 rather than today's date: `new Date(2026, 0 - 1, 1)` rolls back to
  // December 2025 correctly, whereas keeping the day risks landing on a date
  // the previous month doesn't have.
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  let secondsThisMonth = 0;
  let secondsLastMonth = 0;
  let secondsAllTime = 0;

  for (const entry of log) {
    const when = new Date(entry.timestamp);
    if (Number.isNaN(when.getTime())) continue;

    const seconds = entrySeconds(entry);
    if (!seconds) continue;

    secondsAllTime += seconds;
    const key = monthKey(when);
    if (key === thisMonth) secondsThisMonth += seconds;
    else if (key === lastMonth) secondsLastMonth += seconds;
  }

  // Round the sums, not each sit - a dozen 8m12s tracks shouldn't lose two minutes.
  return {
    thisMonth: Math.round(secondsThisMonth / 60),
    lastMonth: Math.round(secondsLastMonth / 60),
    allTime: Math.round(secondsAllTime / 60),
  };
}

/** "0 min", "42 min", "12h 22m" - hours only once there are hours to show. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Whole minutes for one entry, for the CSV export. Empty when unmeasured. */
export function entryMinutes(entry: MeditationLogEntry): string {
  const seconds = entrySeconds(entry);
  return seconds ? String(Math.round(seconds / 60)) : "";
}
