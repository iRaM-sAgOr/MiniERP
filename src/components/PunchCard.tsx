import React, { useState, useEffect } from 'react';
import { Clock, Play, Coffee, Square, HelpCircle } from 'lucide-react';
import { TeamMember, PunchRecord } from '../types';

interface PunchCardProps {
  currentMember: TeamMember;
  punchesForToday: PunchRecord[];
  onPunch: (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => Promise<void>;
  loading: boolean;
}

export default function PunchCard({ currentMember, punchesForToday, onPunch, loading }: PunchCardProps) {
  const [note, setNote] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Find the active ongoing punch (Clocked In but not clocked out yet, and not currently on break)
  const activeInPunch = [...punchesForToday].reverse().find(
    p => p.type === 'Punch' && p.clockOut === undefined
  );

  // Is currently clocked in
  const isClockedIn = currentMember.punchStatus === 'Active';
  const isCurrentlyOnBreak = currentMember.punchStatus === 'Break';

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (activeInPunch && isClockedIn) {
      const startTime = new Date(activeInPunch.clockIn).getTime();
      
      const updateTimer = () => {
        const now = Date.now();
        const diffMs = now - startTime;
        
        const hrs = Math.floor(diffMs / 3600000);
        const mins = Math.floor((diffMs % 3600000) / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        
        const formatNum = (num: number) => num.toString().padStart(2, '0');
        setElapsedTime(`${formatNum(hrs)}:${formatNum(mins)}:${formatNum(secs)}`);
      };

      updateTimer();
      intervalId = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeInPunch, isClockedIn]);

  const handleAction = async (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut') => {
    await onPunch(type, note);
    setNote('');
  };

  const getStatusBgColor = () => {
    switch (currentMember.punchStatus) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Break': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ClockedOut': return 'bg-slate-50 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
  };

  const getStatusDotColor = () => {
    switch (currentMember.punchStatus) {
      case 'Active': return 'bg-emerald-500 animate-pulse';
      case 'Break': return 'bg-amber-500 animate-pulse';
      case 'ClockedOut': return 'bg-slate-400';
      default: return 'bg-slate-300';
    }
  };

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between" id="erp-punch-card-panel">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">Shift Control</h3>
              <p className="text-xs text-[#7a7d75]">Record work attendance standard logs</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBgColor()}`}>
            <span className={`w-2 h-2 rounded-full ${getStatusDotColor()}`}></span>
            {currentMember.punchStatus === 'Active' ? 'Clocked In' : currentMember.punchStatus === 'Break' ? 'On Break' : 'Clocked Out'}
          </div>
        </div>

        {/* Counter Visual */}
        <div className="my-6 bg-[#f4f1e8]/50 rounded-2xl p-6 text-center border border-[#e2dfd2]">
          <p className="text-xs text-[#7a7d75] uppercase tracking-widest font-mono mb-1">Active Elapsed Session</p>
          <div className="text-4xl font-mono font-semibold text-[#5a6e53] tracking-tight">
            {elapsedTime}
          </div>
          {activeInPunch && (
            <p className="text-[11px] text-[#7a7d75] mt-2 font-mono">
              In starting time: {new Date(activeInPunch.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Action Note Input */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Session Notes (Optional)</label>
          <input
            type="text"
            className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5a6e53]/15 transition-all font-sans"
            placeholder="e.g., Working on bugfix ticket #40, alignment design docs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2 mt-4">
        {!isClockedIn && !isCurrentlyOnBreak ? (
          /* Clock In Button */
          <button
            onClick={() => handleAction('Punch')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#5a6e53] hover:opacity-90 text-white rounded-xl py-3 px-4 font-bold text-xs transition-transform active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            Clock In Shift
          </button>
        ) : (
          /* Active Controllers */
          <div className="grid grid-cols-2 gap-2">
            {/* Break Toggle Button */}
            {isCurrentlyOnBreak ? (
              <button
                onClick={() => handleAction('BreakEnd')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 border border-[#e2dfd2] bg-[#f4f1e8] text-[#5a6e53] hover:opacity-90 rounded-xl py-2.5 px-3 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Shift
              </button>
            ) : (
              <button
                onClick={() => handleAction('BreakStart')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-1.5 border border-[#e2dfd2] text-[#3d403a] hover:bg-[#f4f1e8] rounded-xl py-2.5 px-3 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Coffee className="w-3.5 h-3.5 text-[#5a6e53]" />
                Take Break
              </button>
            )}

            {/* Clock Out Button */}
            <button
              onClick={() => handleAction('ClockOut')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100/80 rounded-xl py-2.5 px-3 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Clock Out
            </button>
          </div>
        )}

        {/* Historical Logs Today */}
        {punchesForToday.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#e2dfd2]">
            <h4 className="text-[11px] font-bold text-[#5a6e53] uppercase tracking-wider mb-2">Today&apos;s Punch Timeline</h4>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {punchesForToday.map((p) => (
                <div key={p.id} className="flex justify-between items-start text-[11px] bg-[#f4f1e8]/30 p-2 border border-[#e2dfd2]/50 rounded-lg">
                  <div>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                      p.type === 'Punch' ? 'bg-emerald-500' : p.type === 'BreakStart' ? 'bg-amber-500' : p.type === 'BreakEnd' ? 'bg-blue-500' : 'bg-slate-400'
                    }`}></span>
                    <span className="font-semibold text-[#3d403a]">
                      {p.type === 'Punch' ? 'Clock In' : p.type === 'BreakStart' ? 'Break Start' : p.type === 'BreakEnd' ? 'Break End' : 'Clock Out'}
                    </span>
                    {p.note && <p className="text-[10px] text-[#7a7d75] italic ml-3 mt-0.5">{p.note}</p>}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {new Date(p.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {p.totalMinutes !== undefined && (
                      <span className="block text-[9px] text-[#7a7d75] font-mono">({p.totalMinutes}m logged)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
