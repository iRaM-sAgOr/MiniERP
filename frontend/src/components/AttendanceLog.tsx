import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { TeamMember, DayAttendanceRow } from '../types';
import { formatDuration } from '../utils/punchDuration';

interface AttendanceLogProps {
  members: TeamMember[];
  onFetchMonth: (memberId: string, year: number, month: number) => Promise<DayAttendanceRow[]>;
  currentMember: TeamMember;
  isManager: boolean;
}

const PAGE_SIZE = 10;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export default function AttendanceLog({ members, onFetchMonth, currentMember, isManager }: AttendanceLogProps) {
  const now = new Date();
  const [selectedMemberId, setSelectedMemberId] = useState(currentMember.id);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [page, setPage] = useState(1);
  const [attendanceRows, setAttendanceRows] = useState<DayAttendanceRow[]>([]);
  const [fetchingMonth, setFetchingMonth] = useState(false);

  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isMaxMonth = isCurrentMonth;

  useEffect(() => {
    let cancelled = false;
    setFetchingMonth(true);
    onFetchMonth(selectedMemberId, viewYear, viewMonth).then(rows => {
      if (!cancelled) {
        setAttendanceRows(rows.slice().sort((a, b) => b.date.localeCompare(a.date)));
        setFetchingMonth(false);
      }
    }).catch(() => { if (!cancelled) setFetchingMonth(false); });
    return () => { cancelled = true; };
  }, [selectedMemberId, viewYear, viewMonth]);

  const goToPrevMonth = () => {
    setPage(1);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (isMaxMonth) return;
    setPage(1);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleMemberChange = (id: string) => {
    setSelectedMemberId(id);
    setPage(1);
  };

  const totalWorked = attendanceRows.reduce((s, r) => s + r.workedMinutes, 0);
  const totalBreak = attendanceRows.reduce((s, r) => s + r.breakMinutes, 0);
  const daysWithData = attendanceRows.length;

  const pageCount = Math.max(1, Math.ceil(attendanceRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = attendanceRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedMember = members.find(m => m.id === selectedMemberId) || currentMember;

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[#e2dfd2]">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">
              Attendance Log
            </h3>
            <p className="text-xs text-[#7a7d75]">
              {isManager
                ? 'Punch-based daily time log — select any member'
                : 'Your punch-based daily time breakdown'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Engineer selector (manager only) */}
          {isManager && (
            <select
              value={selectedMemberId}
              onChange={e => handleMemberChange(e.target.value)}
              className="text-xs bg-white border border-[#e2dfd2] rounded-xl px-3 py-2 font-bold text-[#3d403a] focus:outline-[#5a6e53]"
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.roleType})</option>
              ))}
            </select>
          )}

          {/* Month navigator */}
          <div className="flex items-center gap-1 border border-[#e2dfd2] rounded-xl overflow-hidden bg-[#f4f1e8]/50">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-[#e2dfd2] text-[#5a6e53] cursor-pointer transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 text-xs font-bold text-[#3d403a] font-mono whitespace-nowrap">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={goToNextMonth}
              disabled={isMaxMonth}
              className="p-2 hover:bg-[#e2dfd2] text-[#5a6e53] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Member identity strip */}
      <div className="flex items-center gap-2 bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-xl px-3 py-2">
        <img
          src={selectedMember.avatar}
          alt={selectedMember.name}
          className="w-7 h-7 rounded-full object-cover border border-[#e2dfd2]"
          referrerPolicy="no-referrer"
        />
        <span className="text-xs font-bold text-[#3d403a]">{selectedMember.name}</span>
        <span className="text-[10px] text-[#7a7d75]">·</span>
        <span className="text-[10px] text-[#7a7d75]">{selectedMember.role}</span>
        <span className="text-[10px] text-[#7a7d75]">·</span>
        <span className="text-[10px] font-mono text-[#5a6e53] font-bold">{selectedMember.department}</span>
        <span className="ml-auto text-[10px] text-[#7a7d75]">
          Agreement: <strong className="text-[#3d403a]">{selectedMember.agreementHours || 20}h/week</strong>
          {selectedMember.breakDay ? ` · Off: ${selectedMember.breakDay}` : ''}
        </span>
      </div>

      {/* Monthly summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Days Tracked" value={`${daysWithData}`} unit="days" />
        <StatTile
          label="Total Worked"
          value={formatDuration(totalWorked)}
          highlight={totalWorked > 0}
        />
        <StatTile label="Total Break" value={totalBreak > 0 ? formatDuration(totalBreak) : '—'} />
        <StatTile
          label="Avg / Day"
          value={daysWithData > 0 ? formatDuration(Math.round(totalWorked / daysWithData)) : '—'}
        />
      </div>

      {/* Table */}
      {fetchingMonth ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10 gap-2">
          <p className="text-xs text-[#7a7d75] font-semibold">Loading attendance data…</p>
        </div>
      ) : attendanceRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10 gap-2">
          <AlertCircle className="w-6 h-6 text-[#c5c2b8]" />
          <p className="text-xs text-[#7a7d75] font-semibold">No punch records for {MONTH_NAMES[viewMonth]} {viewYear}</p>
          <button onClick={goToPrevMonth} className="text-[11px] text-[#5a6e53] underline font-bold">
            ← Check previous month
          </button>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[80px_1fr_80px_80px_70px_80px_90px] gap-2 px-3 text-[9px] font-bold uppercase tracking-wider text-[#7a7d75] font-mono">
            <span>Date</span>
            <span>Sessions</span>
            <span>First In</span>
            <span>Last Out</span>
            <span>Break</span>
            <span>Worked</span>
            <span>Status</span>
          </div>

          <div className="space-y-1.5">
            {pageRows.map(row => (
              <AttendanceRow key={row.date} row={row} />
            ))}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e2dfd2]">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40 cursor-pointer hover:bg-[#f4f1e8]"
              >
                ← Previous
              </button>
              <span className="text-[10px] font-mono font-bold text-[#7a7d75]">
                Page {safePage} / {pageCount} · {attendanceRows.length} days
              </span>
              <button
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40 cursor-pointer hover:bg-[#f4f1e8]"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AttendanceRow({ row }: { row: DayAttendanceRow }) {
  return (
    <div className={`grid grid-cols-[80px_1fr_80px_80px_70px_80px_90px] gap-2 items-center px-3 py-2.5 rounded-xl border text-xs transition-colors ${
      row.isCapped
        ? 'bg-amber-50/50 border-amber-200/70'
        : 'bg-[#fdfcf8] border-[#e2dfd2] hover:bg-[#f4f1e8]/30'
    }`}>
      {/* Date */}
      <span className="font-bold text-[#3d403a] text-[11px] leading-tight">{fmtDate(row.date)}</span>

      {/* Sessions */}
      <span className="text-[10px] font-mono text-[#7a7d75]">
        {row.sessionCount === 1
          ? '1 session'
          : `${row.sessionCount} sessions`}
      </span>

      {/* First In */}
      <span className="font-mono text-[11px] text-[#3d403a] font-semibold">{fmtTime(row.firstPunchIn)}</span>

      {/* Last Out */}
      <span className={`font-mono text-[11px] font-semibold ${row.isCapped ? 'text-amber-600' : 'text-[#3d403a]'}`}>
        {row.isCapped ? '—' : fmtTime(row.lastClockOut)}
      </span>

      {/* Break */}
      <span className="font-mono text-[11px] text-[#7a7d75]">
        {row.breakMinutes > 0 ? formatDuration(row.breakMinutes) : '—'}
      </span>

      {/* Worked */}
      <span className={`font-mono text-[11px] font-bold ${
        row.isCapped ? 'text-amber-700' : 'text-[#5a6e53]'
      }`}>
        {formatDuration(row.workedMinutes)}
      </span>

      {/* Status */}
      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border text-center ${
        row.isCapped
          ? 'bg-amber-100 border-amber-300 text-amber-800'
          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      }`}>
        {row.isCapped ? 'Auto-Capped' : 'Clocked Out'}
      </span>
    </div>
  );
}

function StatTile({ label, value, unit, highlight }: {
  label: string; value: string; unit?: string; highlight?: boolean;
}) {
  return (
    <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-3 rounded-xl text-center">
      <span className="text-[9px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">{label}</span>
      <span className={`text-lg font-bold block mt-0.5 font-mono ${highlight ? 'text-[#5a6e53]' : 'text-[#3d403a]'}`}>
        {value}
      </span>
      {unit && <span className="text-[9px] text-slate-400 block font-mono">{unit}</span>}
    </div>
  );
}
