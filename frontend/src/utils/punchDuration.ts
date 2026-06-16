import { PunchRecord } from '../types';

/**
 * Compute actual worked minutes for a single day's punch records.
 *
 * State machine — handles multiple punch-in/out cycles and multiple breaks:
 *
 *   Events processed in chronological order:
 *     Punch      → opens a new work segment
 *     BreakStart → pauses the current segment
 *     BreakEnd   → resumes the current segment
 *     ClockOut   → closes the current segment, adds its net time
 *
 *   Edge cases:
 *     - Multiple punch-in/out cycles in one day → each segment accumulated separately
 *     - Multiple breaks per session → all subtracted
 *     - Open break at session end → break counted until session cap
 *     - No ClockOut → open segment capped at 23:59:59 of that day
 */
export function computeWorkedMinutes(dayPunches: PunchRecord[]): number {
  if (!dayPunches || dayPunches.length === 0) return 0;

  const sorted = [...dayPunches].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  const date = sorted[0].date;
  const dayEndMs = new Date(`${date}T23:59:59`).getTime();

  let totalWorkedMs = 0;
  let segmentStartMs: number | null = null; // start of current work segment
  let breakStartMs: number | null = null;   // start of current break within segment
  let segmentBreakMs = 0;                   // accumulated break time in current segment

  for (const p of sorted) {
    const t = new Date(p.clockIn).getTime();

    if (p.type === 'Punch') {
      // If there's already an open segment (e.g. they punched in twice without clocking out),
      // close it defensively before opening a new one
      if (segmentStartMs !== null) {
        if (breakStartMs !== null) {
          segmentBreakMs += Math.max(0, t - breakStartMs);
          breakStartMs = null;
        }
        totalWorkedMs += Math.max(0, t - segmentStartMs - segmentBreakMs);
      }
      segmentStartMs = t;
      breakStartMs = null;
      segmentBreakMs = 0;

    } else if (p.type === 'BreakStart') {
      if (segmentStartMs !== null && breakStartMs === null) {
        breakStartMs = t;
      }

    } else if (p.type === 'BreakEnd') {
      if (breakStartMs !== null) {
        segmentBreakMs += Math.max(0, t - breakStartMs);
        breakStartMs = null;
      }

    } else if (p.type === 'ClockOut') {
      if (segmentStartMs !== null) {
        if (breakStartMs !== null) {
          segmentBreakMs += Math.max(0, t - breakStartMs);
          breakStartMs = null;
        }
        totalWorkedMs += Math.max(0, t - segmentStartMs - segmentBreakMs);
        segmentStartMs = null;
        segmentBreakMs = 0;
      }
    }
  }

  // Still in an open segment at end of day — cap at 23:59:59
  if (segmentStartMs !== null) {
    if (breakStartMs !== null) {
      segmentBreakMs += Math.max(0, dayEndMs - breakStartMs);
    }
    totalWorkedMs += Math.max(0, dayEndMs - segmentStartMs - segmentBreakMs);
  }

  return Math.max(0, Math.round(totalWorkedMs / (1000 * 60)));
}

/** Format minutes into a human-readable string: "2h 45m", "30m", "3h" */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Returns a map of date (YYYY-MM-DD) → worked minutes for a given user.
 * Only includes dates that have at least one Punch record.
 */
export function getDailyWorked(allPunches: PunchRecord[], userId: string): Map<string, number> {
  const byDate = new Map<string, PunchRecord[]>();

  for (const p of allPunches) {
    if (p.userId !== userId) continue;
    const list = byDate.get(p.date) || [];
    list.push(p);
    byDate.set(p.date, list);
  }

  const result = new Map<string, number>();
  for (const [date, records] of byDate.entries()) {
    const minutes = computeWorkedMinutes(records);
    if (minutes > 0) result.set(date, minutes);
  }
  return result;
}

/**
 * True when every punch-in cycle has a corresponding ClockOut (no open session).
 * Works correctly with multiple punch-in/out cycles in a day.
 */
export function hasClockedOut(dayPunches: PunchRecord[]): boolean {
  if (!dayPunches.some(p => p.type === 'Punch')) return false;

  const sorted = [...dayPunches].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  // Track whether the last session is open or closed
  let sessionOpen = false;
  for (const p of sorted) {
    if (p.type === 'Punch') sessionOpen = true;
    else if (p.type === 'ClockOut') sessionOpen = false;
  }
  return !sessionOpen;
}
