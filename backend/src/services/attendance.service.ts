import { prisma } from "../config/prisma.js";
import { MemberRepository } from "../repositories/member.repository.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type RawPunch = {
  id: string;
  userId: string;
  date: string;
  clockIn: string;
  clockOut?: string | null;
  type: string;
  totalMinutes?: number | null;
  note: string;
};

export type DayAttendanceRow = {
  date: string;
  firstPunchIn: string | null;
  lastClockOut: string | null;
  workedMinutes: number;
  breakMinutes: number;
  isCapped: boolean;
  sessionCount: number;
};

export type AttendanceDaySummary = {
  date: string;
  workedMinutes: number;
  isClockedOut: boolean;
};

export type SelfAttendance = {
  todayWorkedMinutes: number;
  isClockedOut: boolean;
  last7Days: AttendanceDaySummary[];
};

export type EngineerAttendanceStat = {
  memberId: string;
  todayWorkedMinutes: number;
  isClockedOut: boolean;
  last7Days: AttendanceDaySummary[];
  completedTasks: number;
};

export type AttendanceData = {
  self: SelfAttendance;
  monthRows: DayAttendanceRow[];
  monthMemberId: string;
  engineerStats?: EngineerAttendanceStat[];
};

// ─── Punch State Machine ──────────────────────────────────────────────────────

/**
 * Computes all attendance fields for a single day's punch records.
 * Ports the same state machine as punchDuration.ts on the frontend.
 */
function computeDayDetail(dayPunches: RawPunch[]): DayAttendanceRow | null {
  if (!dayPunches || dayPunches.length === 0) return null;

  const sorted = [...dayPunches].sort(
    (a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime()
  );

  const date = sorted[0].date;
  const punchEvents = sorted.filter(p => p.type === "Punch");
  if (punchEvents.length === 0) return null;

  const dayEndMs = new Date(`${date}T23:59:59`).getTime();
  const nowMs = Date.now();
  const todayKey = new Date(nowMs).toISOString().split("T")[0];
  const isToday = date === todayKey;
  const firstPunchIn = punchEvents[0].clockIn;

  const clockOutEvents = sorted.filter(p => p.type === "ClockOut");
  const lastClockOut = clockOutEvents.length > 0
    ? clockOutEvents[clockOutEvents.length - 1].clockIn
    : null;

  let totalWorkedMs = 0;
  let totalBreakMs = 0;
  let segmentStartMs: number | null = null;
  let breakStartMs: number | null = null;
  let segmentBreakMs = 0;

  for (const p of sorted) {
    const t = new Date(p.clockIn).getTime();

    if (p.type === "Punch") {
      if (segmentStartMs !== null) {
        if (breakStartMs !== null) {
          const b = Math.max(0, t - breakStartMs);
          segmentBreakMs += b;
          totalBreakMs += b;
          breakStartMs = null;
        }
        totalWorkedMs += Math.max(0, t - segmentStartMs - segmentBreakMs);
      }
      segmentStartMs = t;
      breakStartMs = null;
      segmentBreakMs = 0;
    } else if (p.type === "BreakStart") {
      if (segmentStartMs !== null && breakStartMs === null) breakStartMs = t;
    } else if (p.type === "BreakEnd") {
      if (breakStartMs !== null) {
        const b = Math.max(0, t - breakStartMs);
        segmentBreakMs += b;
        totalBreakMs += b;
        breakStartMs = null;
      }
    } else if (p.type === "ClockOut") {
      if (segmentStartMs !== null) {
        if (breakStartMs !== null) {
          const b = Math.max(0, t - breakStartMs);
          segmentBreakMs += b;
          totalBreakMs += b;
          breakStartMs = null;
        }
        totalWorkedMs += Math.max(0, t - segmentStartMs - segmentBreakMs);
        segmentStartMs = null;
        segmentBreakMs = 0;
      }
    }
  }

  let isCapped = false;
  if (segmentStartMs !== null) {
    const capMs = isToday ? Math.min(nowMs, dayEndMs) : dayEndMs;
    isCapped = !isToday || nowMs >= dayEndMs;

    if (breakStartMs !== null) {
      segmentBreakMs += Math.max(0, capMs - breakStartMs);
    }
    totalWorkedMs += Math.max(0, capMs - segmentStartMs - segmentBreakMs);
  }

  return {
    date,
    firstPunchIn,
    lastClockOut,
    workedMinutes: Math.max(0, Math.round(totalWorkedMs / 60000)),
    breakMinutes: Math.max(0, Math.round(totalBreakMs / 60000)),
    isCapped,
    sessionCount: punchEvents.length,
  };
}

/** Groups an array of punches by date and returns a Map<date, RawPunch[]>. */
function groupByDate(punches: RawPunch[]): Map<string, RawPunch[]> {
  const map = new Map<string, RawPunch[]>();
  for (const p of punches) {
    const list = map.get(p.date) ?? [];
    list.push(p);
    map.set(p.date, list);
  }
  return map;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AttendanceService {
  /** Summary for a single user: today's worked minutes + last 7 days. */
  static async getSelfSummary(userId: string): Promise<SelfAttendance> {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const punches = await prisma.punch.findMany({
      where: { userId, date: { gte: cutoffDate } },
    });

    const byDate = groupByDate(punches);

    const todayDetail = computeDayDetail(byDate.get(today) ?? []);
    const isClockedOut = todayDetail ? (!todayDetail.isCapped && todayDetail.lastClockOut !== null) : false;

    const last7Days: AttendanceDaySummary[] = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, recs]) => {
        const d = computeDayDetail(recs);
        return {
          date,
          workedMinutes: d?.workedMinutes ?? 0,
          isClockedOut: d ? (!d.isCapped && d.lastClockOut !== null) : false,
        };
      });

    return {
      todayWorkedMinutes: todayDetail?.workedMinutes ?? 0,
      isClockedOut,
      last7Days,
    };
  }

  /** Per-day attendance rows for a given user/month (for AttendanceLog). */
  static async getMonthRows(userId: string, year: number, month: number): Promise<DayAttendanceRow[]> {
    const mm = String(month + 1).padStart(2, "0");
    const startDate = `${year}-${mm}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    const punches = await prisma.punch.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
    });

    const rows: DayAttendanceRow[] = [];
    for (const [, recs] of groupByDate(punches).entries()) {
      const detail = computeDayDetail(recs);
      if (detail) rows.push(detail);
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  /** Per-engineer stats for the manager analytics panel. */
  static async getEngineerStats(tasks: { assignedTo: string; status: string }[]): Promise<EngineerAttendanceStat[]> {
    const today = new Date().toISOString().split("T")[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    const [engineers, allPunches] = await Promise.all([
      prisma.member.findMany({ where: { roleType: "Engineer" } }),
      prisma.punch.findMany({ where: { date: { gte: cutoffDate } } }),
    ]);

    return engineers.map(engineer => {
      const engineerPunches = allPunches.filter(p => p.userId === engineer.id);
      const byDate = groupByDate(engineerPunches);

      const todayDetail = computeDayDetail(byDate.get(today) ?? []);

      const last7Days: AttendanceDaySummary[] = Array.from(byDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 7)
        .map(([date, recs]) => {
          const d = computeDayDetail(recs);
          return {
            date,
            workedMinutes: d?.workedMinutes ?? 0,
            isClockedOut: d ? (!d.isCapped && d.lastClockOut !== null) : false,
          };
        });

      const completedTasks = tasks.filter(
        t => t.assignedTo === engineer.id && t.status === "Completed"
      ).length;

      return {
        memberId: engineer.id,
        todayWorkedMinutes: todayDetail?.workedMinutes ?? 0,
        isClockedOut: todayDetail ? (!todayDetail.isCapped && todayDetail.lastClockOut !== null) : false,
        last7Days,
        completedTasks,
      };
    });
  }

  /**
   * Main entry point for the attendance endpoint.
   * - Always returns self summary.
   * - Returns month rows for `monthMemberId` (defaults to self; manager can request any).
   * - Manager additionally gets engineerStats.
   */
  static async getAttendanceData(
    requesterId: string,
    queryMemberId?: string,
    year?: number,
    month?: number
  ): Promise<AttendanceData> {
    const member = await MemberRepository.findById(requesterId);
    const isManager = (member?.roleType ?? "").toLowerCase() === "manager";

    const now = new Date();
    const resolvedYear = year ?? now.getFullYear();
    const resolvedMonth = month ?? now.getMonth(); // 0-indexed

    // Monthly detail: manager can view any member, engineer always sees self
    const monthMemberId = isManager && queryMemberId ? queryMemberId : requesterId;

    const [selfSummary, monthRows] = await Promise.all([
      AttendanceService.getSelfSummary(requesterId),
      AttendanceService.getMonthRows(monthMemberId, resolvedYear, resolvedMonth),
    ]);

    if (!isManager) {
      return { self: selfSummary, monthRows, monthMemberId };
    }

    const allTasks = await prisma.task.findMany({ select: { assignedTo: true, status: true } });
    const engineerStats = await AttendanceService.getEngineerStats(allTasks);

    return { self: selfSummary, monthRows, monthMemberId, engineerStats };
  }
}
