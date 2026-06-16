import React, { useState } from 'react';
import { TeamMember, PunchRecord } from '../types';
import { Clock, Play, Coffee, LogOut, FileText, Timer } from 'lucide-react';
import { computeWorkedMinutes, formatDuration, hasClockedOut } from '../utils/punchDuration';

interface PunchCardProps {
  currentMember: TeamMember;
  punchesForToday: PunchRecord[];
  onPunch: (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => Promise<void>;
  loading: boolean;
}

export default function PunchCard({ currentMember, punchesForToday, onPunch, loading }: PunchCardProps) {
  const [note, setNote] = useState('');
  const status = currentMember.punchStatus || 'Offline';
  const workedMinutes = computeWorkedMinutes(punchesForToday);
  const didClockOut = hasClockedOut(punchesForToday);

  const handlePunchAction = async (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut') => {
    await onPunch(type, note);
    setNote('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Break':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ClockedOut':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-zinc-50 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div className="bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-[#5a6e53]" />
          <h3 className="font-bold text-[#3d403a] font-serif text-base">Shift Attendance Gate</h3>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>

      {/* Action note input */}
      <div className="mb-5">
        <label className="block text-[11px] font-bold text-[#7a7d75] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Shift Note / Diagnostic Log
        </label>
        <input
          type="text"
          placeholder="Brief summary of focus area (e.g. debugging Vite routing issues)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full text-xs px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] placeholder-[#7a7d75]/50 focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200"
          disabled={loading}
        />
      </div>

      {/* Buttons controls */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {(status === 'Offline' || status === 'ClockedOut') && (
          <button
            onClick={() => handlePunchAction('Punch')}
            disabled={loading}
            className="col-span-2 flex items-center justify-center gap-2 py-3 bg-[#5a6e53] hover:bg-[#485942] text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
          >
            <Play className="w-4 h-4" /> Clock In / Begin Shift
          </button>
        )}

        {status === 'Active' && (
          <>
            <button
              onClick={() => handlePunchAction('BreakStart')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
            >
              <Coffee className="w-4 h-4" /> Take Coffee Break
            </button>
            <button
              onClick={() => handlePunchAction('ClockOut')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> Clock Out Shift
            </button>
          </>
        )}

        {status === 'Break' && (
          <>
            <button
              onClick={() => handlePunchAction('BreakEnd')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Resume Shift Work
            </button>
            <button
              onClick={() => handlePunchAction('ClockOut')}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" /> Clock Out Shift
            </button>
          </>
        )}
      </div>

      {/* Worked time summary */}
      {punchesForToday.length > 0 && (
        <div className={`mb-4 flex items-center justify-between px-3 py-2 rounded-xl border ${
          didClockOut
            ? 'bg-emerald-50 border-emerald-200'
            : status === 'Break'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-[#f4f1e8] border-[#e2dfd2]'
        }`}>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#3d403a] uppercase tracking-wider">
            <Timer className="w-3.5 h-3.5 text-[#5a6e53]" />
            Today&apos;s Worked Time
          </span>
          <div className="text-right">
            <span className={`text-base font-bold font-mono ${
              didClockOut ? 'text-emerald-700' : 'text-[#5a6e53]'
            }`}>
              {formatDuration(workedMinutes)}
            </span>
            {!didClockOut && punchesForToday.some(p => p.type === 'Punch') && (
              <span className="block text-[9px] text-amber-600 font-mono font-bold">still running</span>
            )}
          </div>
        </div>
      )}

      {/* Today's Punch History Timeline */}
      <div className="border-t border-[#e2dfd2]/60 pt-4">
        <h4 className="text-[11px] font-bold text-[#7a7d75] uppercase tracking-wider mb-3">Today's Shift Log Timeline</h4>
        {punchesForToday.length === 0 ? (
          <p className="text-xs text-[#7a7d75] italic text-center py-4 bg-[#f4f1e8]/30 rounded-xl border border-[#e2dfd2]/40">
            No shifts recorded in the registry today yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
            {punchesForToday.map((p, idx) => (
              <div key={p.id || idx} className="flex items-start gap-3 text-left p-2.5 rounded-xl border border-[#e2dfd2]/30 bg-[#f4f1e8]/10">
                <div className="mt-1">
                  {p.type === 'Punch' && <span className="w-2 h-2 rounded-full bg-emerald-500 block" />}
                  {p.type === 'BreakStart' && <span className="w-2 h-2 rounded-full bg-amber-500 block" />}
                  {p.type === 'BreakEnd' && <span className="w-2 h-2 rounded-full bg-emerald-500 block" />}
                  {p.type === 'ClockOut' && <span className="w-2 h-2 rounded-full bg-rose-500 block" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-[#3d403a]">
                      {p.type === 'Punch' && 'Clocked In'}
                      {p.type === 'BreakStart' && 'Started Break'}
                      {p.type === 'BreakEnd' && 'Resumed Work'}
                      {p.type === 'ClockOut' && 'Clocked Out'}
                    </span>
                    <span className="text-[9px] font-mono text-[#7a7d75]">
                      {new Date(p.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {p.note && <p className="text-[10px] text-[#7a7d75] mt-0.5 leading-snug">{p.note}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
