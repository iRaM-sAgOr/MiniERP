import React, { useEffect, useState } from 'react';
import { 
  Users, 
  ClipboardList, 
  ShieldAlert, 
  BadgeInfo, 
  Play, 
  ArrowRight, 
  UserCheck, 
  Calendar, 
  RefreshCw, 
  Star, 
  Mail, 
  CheckSquare,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Minus
} from 'lucide-react';
import { TeamMember, TaskDistribution, WorkLog } from '../types';
import TaskDetailsDialog from './TaskDetailsDialog';
import { computeWorkedMinutes, formatDuration, getDailyWorked, hasClockedOut } from '../utils/punchDuration';

interface TeamDashboardProps {
  currentMember: TeamMember;
  members: TeamMember[];
  punches: any[];
  tasks: TaskDistribution[];
  worklogs: WorkLog[];
  onUpdateTaskStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  onAddComment: (taskId: string, text: string) => Promise<void>;
  onUpdateSubtasks: (taskId: string, subtasks: any[]) => Promise<void>;
  onUpdateTaskDetails: (taskId: string, updates: any) => Promise<void>;
  loading: boolean;
  onUpdateUserRole?: (userId: string, roleType: 'Engineer' | 'Manager') => Promise<void>;
  onGeneratePasswordResetToken?: (memberId: string) => Promise<{ member: { id: string; name: string; email: string }; resetToken: string; expiresAt: string }>;
}

export default function TeamDashboard({
  currentMember,
  members,
  punches,
  tasks,
  worklogs,
  onUpdateTaskStatus,
  onAddComment,
  onUpdateSubtasks,
  onUpdateTaskDetails,
  loading,
  onUpdateUserRole,
  onGeneratePasswordResetToken
}: TeamDashboardProps) {
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedHistoryMemberId, setSelectedHistoryMemberId] = useState(currentMember.id);
  const [historyPage, setHistoryPage] = useState(1);
  const [resetTargetMemberId, setResetTargetMemberId] = useState('');
  const [generatedResetPreview, setGeneratedResetPreview] = useState<{ memberName: string; token: string; expiresAt: string } | null>(null);
  const [generatingReset, setGeneratingReset] = useState(false);

  const isManager = currentMember.roleType === 'Manager';
  const pageSize = 5;

  // Days of the week representing break times
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayDateKey = new Date().toISOString().split('T')[0];

  const getPriorityBadgeColor = (prio: TaskDistribution['priority']) => {
    switch (prio) {
      case 'High': return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'Medium': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Low': return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getStatusBadgeColor = (status: TaskDistribution['status']) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'In Progress': return 'bg-indigo-50 border-indigo-100 text-indigo-700';
      case 'Pending': return 'bg-slate-50 border-slate-100 text-slate-600';
    }
  };

  useEffect(() => {
    setSelectedHistoryMemberId(currentMember.id);
    setHistoryPage(1);
  }, [currentMember.id]);

  const getMemberStatusBadge = (status: TeamMember['punchStatus']) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Break': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'ClockedOut': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Offline': return 'bg-slate-100 text-slate-400 border-slate-200';
    }
  };

  // Compute stats for current engineer (if applicable)
  const myLogs = worklogs.filter(wl => wl.userId === currentMember.id);
  const totalMyHours = myLogs.reduce((sum, wl) => {
    return sum + wl.items.reduce((acc, it) => acc + it.hoursSpent, 0);
  }, 0);

  const selectedHistoryMember = members.find(member => member.id === selectedHistoryMemberId) || currentMember;
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 30);
  const historyLogs = worklogs
    .filter(wl => wl.userId === selectedHistoryMember.id && new Date(`${wl.date}T00:00:00`).getTime() >= historyCutoff.getTime())
    .sort((a, b) => {
      const dateDelta = b.date.localeCompare(a.date);
      if (dateDelta !== 0) return dateDelta;
      return (b.submittedAt || '').localeCompare(a.submittedAt || '');
    });
  const historyPageCount = Math.max(1, Math.ceil(historyLogs.length / pageSize));
  const safeHistoryPage = Math.min(historyPage, historyPageCount);
  const historyPageItems = historyLogs.slice((safeHistoryPage - 1) * pageSize, safeHistoryPage * pageSize);
  const historyTotalHours = historyLogs.reduce((sum, wl) => sum + wl.items.reduce((acc, it) => acc + it.hoursSpent, 0), 0);

  const engineerMembers = members.filter(member => member.roleType === 'Engineer');
  const managerAnalyticsRows = engineerMembers.map(engineer => {
    // Punch-based per-day durations (source of truth for worked hours)
    const dailyWorked = getDailyWorked(punches, engineer.id);
    const punchDailyItems = Array.from(dailyWorked.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 7)
      .map(([date, minutes]) => ({ date, minutes }));

    const todayWorkedMinutes = computeWorkedMinutes(
      punches.filter((p: any) => p.userId === engineer.id && p.date === todayDateKey)
    );
    const todayClockedOut = hasClockedOut(
      punches.filter((p: any) => p.userId === engineer.id && p.date === todayDateKey)
    );

    const completedTasks = tasks.filter(t => t.assignedTo === engineer.id && t.status === 'Completed').length;

    return {
      engineer,
      punchDailyItems,
      todayWorkedMinutes,
      todayClockedOut,
      completedTasks,
    };
  });

  useEffect(() => {
    if (historyPage > historyPageCount) {
      setHistoryPage(historyPageCount);
    }
  }, [historyPage, historyPageCount]);

  const handleRoleTypeChange = async (userId: string, newRoleType: 'Engineer' | 'Manager') => {
    if (!onUpdateUserRole) return;
    setRoleChangingId(userId);
    try {
      await onUpdateUserRole(userId, newRoleType);
    } finally {
      setRoleChangingId(null);
    }
  };

  const handleGenerateResetToken = async () => {
    if (!onGeneratePasswordResetToken || !resetTargetMemberId) return;
    setGeneratingReset(true);
    try {
      const result = await onGeneratePasswordResetToken(resetTargetMemberId);
      setGeneratedResetPreview({
        memberName: result.member.name,
        token: result.resetToken,
        expiresAt: result.expiresAt,
      });
    } finally {
      setGeneratingReset(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="erp-team-dashboard-bento">
      
      {/* 1. Roster Column (Dual View) */}
      <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2dfd2]">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">
                  {isManager ? 'Enterprise Team Roster (Manager Terminal)' : 'My Activity & Schedule Roster'}
                </h3>
                <p className="text-xs text-[#7a7d75]">
                  {isManager ? 'Audit working schedules, custom break schedules & modify roles' : 'Track your weekly agreements & clock statistics'}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#5a6e53] font-mono bg-[#f4f1e8] px-2.5 py-0.5 rounded-full border border-[#e2dfd2]/50">
              {isManager ? `${members.length} Registered` : 'Secure Token'}
            </span>
          </div>

          {!isManager ? (
            /* Secure restricted Engineer Personal View */
            <div className="space-y-4">
              <div className="bg-amber-50/75 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-xs text-amber-800 leading-relaxed">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Privacy Clearance Level: Engineer Profile</p>
                  <p className="mt-1 text-[#5c5440]">
                    Only certified **Managers** can view emails, schedules, live logs, and active clock timelines of other distributed Engineers.
                  </p>
                </div>
              </div>

              {/* Personal hours tracked */}
              {(() => {
                const myTodayWorked = computeWorkedMinutes(
                  punches.filter((p: any) => p.userId === currentMember.id && p.date === todayDateKey)
                );
                const myTodayClockedOut = hasClockedOut(
                  punches.filter((p: any) => p.userId === currentMember.id && p.date === todayDateKey)
                );
                const myDailyWorked = getDailyWorked(punches, currentMember.id);
                const myPunchHistory = Array.from(myDailyWorked.entries())
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .slice(0, 7);

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-4 rounded-xl text-center">
                        <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">Today&apos;s Clock Time</span>
                        <span className={`text-2xl font-bold block mt-1 font-mono ${myTodayClockedOut ? 'text-emerald-700' : myTodayWorked > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                          {myTodayWorked > 0 ? formatDuration(myTodayWorked) : '—'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {myTodayClockedOut ? 'Final (clocked out)' : myTodayWorked > 0 ? 'Still running' : 'Not clocked in today'}
                        </span>
                      </div>

                      <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-4 rounded-xl text-center">
                        <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">Weekly Agreement</span>
                        <span className="text-2xl font-bold text-[#5a6e53] block mt-1 font-mono">{currentMember.agreementHours || 20} hrs/week</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Approved in system setting</span>
                      </div>
                    </div>

                    {myPunchHistory.length > 0 && (
                      <div className="bg-[#f4f1e8]/20 border border-[#e2dfd2]/80 p-3 rounded-2xl">
                        <span className="text-[10px] font-bold text-[#3d403a] uppercase tracking-wider font-mono block mb-2">My Punch-Based Duration (last 7 days)</span>
                        <div className="flex flex-wrap gap-1.5">
                          {myPunchHistory.map(([date, minutes]) => (
                            <div key={date} className="text-center bg-white border border-[#e2dfd2] rounded-lg px-2 py-1">
                              <span className="text-[9px] text-[#7a7d75] font-mono block">{date.slice(5)}</span>
                              <span className="text-xs font-bold font-mono text-[#5a6e53]">{formatDuration(minutes)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Personal break day info */}
              <div className="bg-[#f4f1e8]/20 border border-[#e2dfd2]/80 p-4 rounded-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#e2dfd2]/60 mb-2">
                  <span className="text-xs font-bold text-[#3d403a] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#5a6e53]" />
                    Preferred Break Schedule Setting
                  </span>
                  <span className="text-xs font-semibold text-[#5a6e53] bg-[#f4f1e8] border border-[#e2dfd2]/70 px-2 py-0.5 rounded-md font-mono">
                    {currentMember.breakDay || 'Friday'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#7a7d75]">
                  <span>Today is: <strong className="text-[#3d403a]">{todayDayName}</strong></span>
                  <span>
                    {(currentMember.breakDay || 'Friday').split(',').map((d: string) => d.trim().toLowerCase()).includes(todayDayName.toLowerCase()) ? (
                      <span className="text-emerald-700 font-bold">🏖️ Today is one of your off-break days!</span>
                    ) : (
                      <span className="text-slate-500 font-semibold">💼 Today is a standard check-in work day.</span>
                    )}
                  </span>
                </div>
              </div>

              {/* My list of previous work log summaries */}
              <div className="space-y-2 mt-2">
                <h4 className="text-xs font-bold text-[#2d3a2a] uppercase tracking-wider font-mono">My Daily Task History</h4>
                {myLogs.length === 0 ? (
                  <p className="text-[11px] text-[#7a7d75] italic">No daily task logs submitted yet from your account today.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto font-sans">
                    {myLogs.map((log) => (
                      <div key={log.id} className="p-2.5 bg-[#f5f5f0] border border-[#e2dfd2] rounded-xl text-left">
                        <div className="flex justify-between items-center text-[10px] text-[#7a7d75] font-mono mb-1.5 font-bold">
                          <span>Report Ref: #{log.id}</span>
                          <span>{new Date(log.submittedAt).toLocaleDateString()}</span>
                        </div>
                        {log.items.map((it, i) => (
                          <div key={i} className="mb-1 text-xs">
                            <span className="font-extrabold uppercase text-[9px] bg-slate-200 text-[#3d403a] px-1 rounded mr-1.5">{it.project}</span>
                            <span className="text-[#3d403a]">{it.description}</span>
                            {it.githubLink && (
                              <span className="ml-1 text-[10px] text-sky-700 font-mono">({it.githubLink})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Manager Roster Board (Full Audit, Email, Agreement & Database role changing) */
            <div className="space-y-4">
              <div className="bg-white border border-[#e2dfd2]/80 p-3 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-[#2d3a2a] uppercase tracking-wider font-mono">Engineer Productivity Dashboard</h4>
                  <span className="text-[10px] text-[#7a7d75] font-mono">Daily worklog, punch time, completed tasks</span>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {managerAnalyticsRows.map(row => (
                    <div key={row.engineer.id} className="border border-[#e2dfd2] rounded-xl p-2 bg-[#fdfcf8]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <img src={row.engineer.avatar} alt={row.engineer.name} className="w-5 h-5 rounded-full object-cover border border-[#e2dfd2]" referrerPolicy="no-referrer" />
                          <span className="font-bold text-[#3d403a]">{row.engineer.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                            row.engineer.punchStatus === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            row.engineer.punchStatus === 'Break' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            'bg-slate-50 border-slate-200 text-slate-500'
                          }`}>{row.engineer.punchStatus}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#5a6e53]">✓ {row.completedTasks} tasks</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-[#7a7d75] font-mono">Today worked:</span>
                        <span className={`text-xs font-bold font-mono ${
                          row.todayClockedOut ? 'text-emerald-700' :
                          row.todayWorkedMinutes > 0 ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                          {row.todayWorkedMinutes > 0 ? formatDuration(row.todayWorkedMinutes) : 'Not clocked in'}
                          {!row.todayClockedOut && row.todayWorkedMinutes > 0 && <span className="text-[9px] ml-1">(ongoing)</span>}
                        </span>
                      </div>
                      {row.punchDailyItems.length > 0 && (
                        <div className="mt-1.5">
                          <span className="text-[9px] text-[#7a7d75] font-mono block mb-1">Punch-based history (last 7 days):</span>
                          <div className="flex flex-wrap gap-1">
                            {row.punchDailyItems.map(item => (
                              <span key={item.date} className="text-[10px] px-1.5 py-0.5 rounded border border-[#e2dfd2] bg-[#f4f1e8] text-[#3d403a] font-mono">
                                {item.date.slice(5)}: {formatDuration(item.minutes)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {onGeneratePasswordResetToken && (
                <div className="bg-white border border-[#e2dfd2]/80 p-3 rounded-2xl space-y-2">
                  <h4 className="text-xs font-extrabold text-[#2d3a2a] uppercase tracking-wider font-mono">Manager Assisted Password Recovery</h4>
                  <div className="flex items-center gap-2">
                    <select
                      value={resetTargetMemberId}
                      onChange={(e) => setResetTargetMemberId(e.target.value)}
                      className="flex-1 text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-2 py-1.5 text-[#3d403a]"
                    >
                      <option value="">Select engineer account</option>
                      {engineerMembers.map(member => (
                        <option key={member.id} value={member.id}>{member.name} ({member.email})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleGenerateResetToken}
                      disabled={!resetTargetMemberId || generatingReset}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl border border-[#5a6e53] text-[#5a6e53] hover:bg-[#f4f1e8] disabled:opacity-40 cursor-pointer"
                    >
                      Generate Token
                    </button>
                  </div>
                  {generatedResetPreview && (
                    <div className="text-[11px] bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-xl p-2 text-left">
                      <p><strong>{generatedResetPreview.memberName}</strong> recovery token: <span className="font-mono text-[#5a6e53]">{generatedResetPreview.token}</span></p>
                      <p className="text-[#7a7d75]">Expires: {new Date(generatedResetPreview.expiresAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {members.map((member) => {
                  const memberLog = worklogs.find(wl => wl.userId === member.id);
                  
                  // Compute total recorded hours from past worklogs for this engineer
                  const pastLogs = worklogs.filter(wl => wl.userId === member.id);
                  const totalHrs = pastLogs.reduce((acc, wl) => acc + wl.items.reduce((s, i) => s + i.hoursSpent, 0), 0);
                  
                  // Is today their break day?
                  const isBreakToday = (member.breakDay || '').split(',').map((d: string) => d.trim().toLowerCase()).includes(todayDayName.toLowerCase());

                  return (
                    <div 
                      key={member.id} 
                      className={`p-3 border rounded-2xl transition-colors text-left space-y-2 bg-[#f4f1e8]/20 ${
                        member.roleType === 'Manager' ? 'border-[#d4a373]/30 bg-[#fbfaf5]' : 'border-[#e2dfd2]'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#e2dfd2]"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-extrabold text-[#3d403a]">{member.name}</h4>
                              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none ${
                                member.roleType === 'Manager' ? 'bg-[#d4a373] text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {member.roleType}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono text-left block">{member.email}</span>
                          </div>
                        </div>

                        {/* Roster detail signals */}
                        <div className="text-right space-y-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border ${getMemberStatusBadge(member.punchStatus)}`}>
                            <span className={`w-1 h-1 rounded-full ${
                              member.punchStatus === 'Active' ? 'bg-emerald-500' : member.punchStatus === 'Break' ? 'bg-amber-500' : 'bg-slate-500'
                            }`} />
                            {member.punchStatus}
                          </span>
                          <span className="block text-[9px] text-[#7a7d75] font-mono font-semibold">
                            Agreement: {member.agreementHours || 20}h • Off: {member.breakDay || 'Friday'}
                          </span>
                        </div>
                      </div>

                      {/* Working logs summary */}
                      <div className="bg-white border border-[#e2dfd2]/80 p-2 rounded-xl text-[11px] grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block">DATABASE TRACKED HOURS:</span>
                          <span className="font-mono font-bold text-[#5a6e53]">{totalHrs} Total working hours</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block">AVAILABILITY TODAY:</span>
                          {isBreakToday ? (
                            <span className="text-amber-600 font-bold">🏖️ On break ({member.breakDay})</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">💼 Available for tasks</span>
                          )}
                        </div>
                      </div>

                      {/* Database Live Role Switcher ("from db we will change the role as manager") */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#e2dfd2]/50 text-[10px]">
                        <span className="text-[#7a7d75] font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#5a6e53]" />
                          Database Privilege Override:
                        </span>
                        
                        <div className="flex gap-1">
                          <select
                            value={member.roleType}
                            onChange={(e) => handleRoleTypeChange(member.id, e.target.value as any)}
                            disabled={loading || roleChangingId === member.id}
                            className="bg-white border border-[#e2dfd2] rounded px-1.5 py-0.5 font-bold cursor-pointer text-xs"
                          >
                            <option value="Engineer">Engineer Role</option>
                            <option value="Manager">Manager Role</option>
                          </select>
                          {roleChangingId === member.id && (
                            <span className="animate-spin text-[#5a6e53] text-[9px]">⚙️</span>
                          )}
                        </div>
                      </div>

                      {memberLog && memberLog.aiSummarized && (
                        <div className="text-[10px] bg-slate-50 border border-slate-200/60 p-2 rounded-xl italic text-slate-600">
                          <strong>Latest Daily Description:</strong> &ldquo;{memberLog.aiSummarized}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 pt-5 border-t border-[#e2dfd2] space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-[#2d3a2a] uppercase tracking-wider font-mono">Work Hour History</h4>
              <p className="text-[11px] text-[#7a7d75]">Last 30 days of submitted work logs with pagination.</p>
            </div>

            {isManager ? (
              <select
                value={selectedHistoryMemberId}
                onChange={(e) => {
                  setSelectedHistoryMemberId(e.target.value);
                  setHistoryPage(1);
                }}
                className="text-xs bg-white border border-[#e2dfd2] rounded-xl px-3 py-2 font-bold text-[#3d403a]"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            ) : (
              <div className="text-[10px] font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] border border-[#e2dfd2] px-2.5 py-1 rounded-full">
                {currentMember.name}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-3 rounded-xl text-center">
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">30-Day Total Hours</span>
              <span className="text-2xl font-bold text-[#5a6e53] block mt-1 font-mono">{historyTotalHours}h</span>
            </div>
            <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-3 rounded-xl text-center">
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">History Records</span>
              <span className="text-2xl font-bold text-[#5a6e53] block mt-1 font-mono">{historyLogs.length}</span>
            </div>
          </div>

          {historyLogs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10">
              <p className="text-[#7a7d75] text-xs">No work logs found in the last 30 days.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historyPageItems.map(log => {
                const dailyHours = log.items.reduce((sum, item) => sum + item.hoursSpent, 0);
                const punchMinutes = computeWorkedMinutes(
                  punches.filter((p: any) => p.userId === selectedHistoryMember.id && p.date === log.date)
                );
                const didPunchOut = hasClockedOut(
                  punches.filter((p: any) => p.userId === selectedHistoryMember.id && p.date === log.date)
                );
                return (
                  <div key={log.id} className="bg-white border border-[#e2dfd2] rounded-2xl p-3 text-left">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h5 className="text-xs font-bold text-[#3d403a]">{log.date}</h5>
                        <p className="text-[10px] text-[#7a7d75] font-mono">Submitted {new Date(log.submittedAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        {punchMinutes > 0 ? (
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                            didPunchOut ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            ⏱ {formatDuration(punchMinutes)}{!didPunchOut ? ' (no clock-out)' : ''}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50">no punch data</span>
                        )}
                        <span className="text-[10px] font-bold text-[#5a6e53] bg-[#f4f1e8] border border-[#e2dfd2] px-2 py-0.5 rounded-full font-mono">{dailyHours}h logged</span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {log.items.map((item, index) => (
                        <div key={index} className="text-[11px] text-[#3d403a] leading-relaxed">
                          <span className="font-bold uppercase text-[9px] bg-slate-200 text-[#3d403a] px-1 rounded mr-1.5">{item.project}</span>
                          {item.description} <span className="text-slate-400 font-mono">({item.hoursSpent}h)</span>
                        </div>
                      ))}
                    </div>
                    {log.aiSummarized && (
                      <p className="mt-2 text-[10px] text-slate-600 italic bg-slate-50 border border-slate-200/60 rounded-xl p-2">{log.aiSummarized}</p>
                    )}
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                  disabled={safeHistoryPage === 1}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[10px] font-mono font-bold text-[#7a7d75]">
                  Page {safeHistoryPage} / {historyPageCount}
                </span>
                <button
                  onClick={() => setHistoryPage(page => Math.min(historyPageCount, page + 1))}
                  disabled={safeHistoryPage === historyPageCount}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Tasks Assignments Backlog */}
      <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#e2dfd2] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
                <ClipboardList className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">Active Deliverables List</h3>
                <p className="text-xs text-[#7a7d75]">Distributed USA operational tasks</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#5a6e53] font-mono bg-[#f4f1e8] px-2.5 py-0.5 rounded-full border border-[#e2dfd2]/50">
              {tasks.length} Active System-wide
            </span>
          </div>

          {/* Quick Task Search & Filter Band */}
          <div className="space-y-2 mb-4 bg-[#f4f1e8]/30 p-3 rounded-2xl border border-[#e2dfd2]/60">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-3.5 w-3.5 text-[#7a7d75]" />
              </span>
              <input
                type="text"
                placeholder="Search tasks by title or criteria..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl pl-9 pr-3 py-1.5 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1 text-[10px]">
              <span className="text-[#7a7d75] font-bold font-mono">Priority Filter:</span>
              <div className="flex gap-1">
                {(['All', 'High', 'Medium', 'Low'] as const).map(prio => (
                  <button
                    key={prio}
                    onClick={() => setTaskPriorityFilter(prio)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-lg cursor-pointer border transition-colors ${
                      taskPriorityFilter === prio
                        ? 'bg-[#5a6e53] text-white border-[#5a6e53]'
                        : 'bg-white hover:bg-[#f4f1e8] text-[#3d403a] border-[#e2dfd2]'
                    }`}
                  >
                    {prio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const userFilterTasks = tasks.filter(t => !isManager ? t.assignedTo === currentMember.id : true);
            const queriedTasks = userFilterTasks.filter(t => {
              const matchesQuery = t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                t.description.toLowerCase().includes(taskSearch.toLowerCase());
              const matchesPrio = taskPriorityFilter === 'All' || t.priority === taskPriorityFilter;
              return matchesQuery && matchesPrio;
            });

            if (userFilterTasks.length === 0) {
              return (
                <div className="text-center py-24 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10">
                  <p className="text-[#7a7d75] text-xs">No tasks inside your database backlog.</p>
                </div>
              );
            }

            if (queriedTasks.length === 0) {
              return (
                <div className="text-center py-16 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10">
                  <p className="text-[#7a7d75] text-xs font-semibold">No tasks match your search criteria.</p>
                  <button 
                    onClick={() => { setTaskSearch(''); setTaskPriorityFilter('All'); }}
                    className="mt-2 text-[10px] font-bold text-[#5a6e53] underline"
                  >
                    Clear Filter Filters
                  </button>
                </div>
              );
            }

            const myQueriedTasks = queriedTasks.filter(task => task.assignedTo === currentMember.id);
            const otherQueriedTasks = queriedTasks.filter(task => task.assignedTo !== currentMember.id);

            const renderTaskCard = (task: TaskDistribution) => {
              const assignedToMember = members.find(m => m.id === task.assignedTo);
              const assignedByMember = members.find(m => m.id === task.assignedBy);

              return (
                <div
                  key={task.id}
                  className="p-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl hover:bg-[#f4f1e8]/30 hover:border-[#5a6e53]/35 hover:shadow-xs transition-all space-y-2.5 cursor-pointer group text-left"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1 text-left flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.projectName && (
                          <span className="text-[9px] bg-emerald-50 text-[#5a6e53] font-extrabold font-mono px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                            📂 {task.projectName}
                          </span>
                        )}
                        {task.priority === 'High' && (
                          <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        )}
                        {task.priority === 'Medium' && (
                          <Minus className="w-3.5 h-3.5 text-amber-500 shrink-0 bg-amber-50 rounded-full border border-amber-300" />
                        )}
                        {task.priority === 'Low' && (
                          <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                        <h4 className="text-xs font-extrabold text-[#3d403a] leading-tight truncate">{task.title}</h4>
                      </div>
                      <p className="text-[11px] text-[#7a7d75] whitespace-normal leading-relaxed">{task.description}</p>
                    </div>
                    <div className="flex gap-1 shrink-0 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getPriorityBadgeColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getStatusBadgeColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap shrink-0 justify-between items-center bg-[#f4f1e8]/20 p-2 border border-[#e2dfd2]/40 rounded-xl text-left gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[#7a7d75] font-mono block uppercase text-[8px] tracking-wider font-extrabold">Work Timeline:</span>
                      <span className="font-semibold text-[#3d403a] font-mono text-[9.5px]">{task.startDate || 'N/A'} to {task.endDate || task.dueDate || 'N/A'}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[#7a7d75] font-mono block uppercase text-[8px] tracking-wider font-extrabold text-right">Scope vs Logged Actuals:</span>
                      <span className="font-mono text-[10px] text-right block">
                        Allocated: <span className="text-slate-800 font-bold">{task.estimatedHours || 12}h</span>
                        {" | "}
                        Spent: <span className={`font-bold font-mono ${(task.actualHours || 0) > (task.estimatedHours || 0) ? 'text-red-500 font-extrabold' : 'text-[#3d403a]'}`}>{task.actualHours || 0}h</span>
                      </span>
                    </div>
                  </div>

                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-[#5a6e53]">
                        <span className="flex items-center gap-1">🎯 Checklist Progress:</span>
                        <span>
                          {task.subtasks.filter(s => s.isCompleted).length} / {task.subtasks.length} done ({Math.round((task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden border border-slate-200/50">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{
                            width: `${Math.round((task.subtasks.filter(s => s.isCompleted).length / task.subtasks.length) * 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#e2dfd2]/40 text-[10px] gap-2">
                    <div className="flex items-center gap-3">
                      {assignedToMember && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="text-[#7a7d75] font-mono uppercase text-[9px]">Assignee:</span>
                          <span className="font-bold text-[#3d403a]">{assignedToMember.name}</span>
                        </div>
                      )}
                      {assignedByMember && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="text-[#7a7d75] font-mono uppercase text-[9px]">By:</span>
                          <span className="font-semibold text-slate-500">{assignedByMember.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-[#7a7d75] flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-[#5a6e53]" />
                      <span>Due: {task.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-[#7a7d75] font-mono font-bold bg-[#f4f1e8]/30 p-1.5 rounded-xl border border-[#e2dfd2]/40 group-hover:bg-[#f4f1e8]/50 group-hover:border-[#e2dfd2]/70 transition-colors">
                    <span className="flex items-center gap-1 font-sans">
                      💬 {task.comments?.length || 0} communication notes
                    </span>
                    <span className="text-[#5a6e53] font-bold uppercase underline tracking-wider group-hover:text-stone-700">
                      🔍 Expanded Specs & History →
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 px-1 pt-1" onClick={(e) => e.stopPropagation()}>
                    {task.status !== 'Pending' && (
                      <button
                        onClick={() => onUpdateTaskStatus(task.id, 'Pending')}
                        disabled={loading || (!isManager && task.assignedTo !== currentMember.id)}
                        className="text-[9px] border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] px-2 py-0.5 text-[#3d403a] rounded font-semibold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Mark Pending
                      </button>
                    )}
                    {task.status !== 'In Progress' && (
                      <button
                        onClick={() => onUpdateTaskStatus(task.id, 'In Progress')}
                        disabled={loading || (!isManager && task.assignedTo !== currentMember.id)}
                        className="text-[9px] border border-[#d4a373]/30 bg-[#f4f1e8] hover:opacity-90 px-2 py-0.5 text-[#d4a373] rounded font-bold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        In Progress
                      </button>
                    )}
                    {task.status !== 'Completed' && (
                      <button
                        onClick={() => onUpdateTaskStatus(task.id, 'Completed')}
                        disabled={loading || (!isManager && task.assignedTo !== currentMember.id)}
                        className="text-[9px] bg-[#5a6e53] hover:opacity-90 px-2.5 py-0.5 text-white rounded font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {isManager ? (
                  queriedTasks.map(renderTaskCard)
                ) : (
                  <>
                    <div className="rounded-xl border border-[#e2dfd2] bg-[#f4f1e8]/25 p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-extrabold text-[#2d3a2a] uppercase tracking-wider font-mono">My Tasks</h4>
                        <span className="text-[10px] font-bold text-[#5a6e53]">{myQueriedTasks.length}</span>
                      </div>
                      <div className="space-y-3">
                        {myQueriedTasks.length > 0 ? myQueriedTasks.map(renderTaskCard) : (
                          <p className="text-[11px] text-[#7a7d75] italic">No personal tasks in current filter.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#e2dfd2] bg-white p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-extrabold text-[#2d3a2a] uppercase tracking-wider font-mono">Other Engineers' Tasks</h4>
                        <span className="text-[10px] font-bold text-slate-500">{otherQueriedTasks.length}</span>
                      </div>
                      <div className="space-y-3">
                        {otherQueriedTasks.length > 0 ? otherQueriedTasks.map(renderTaskCard) : (
                          <p className="text-[11px] text-[#7a7d75] italic">No other engineers' tasks in current filter.</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Expanded task details modal overlay */}
      {selectedTaskId && (() => {
        const selectedTask = tasks.find(t => t.id === selectedTaskId);
        if (!selectedTask) return null;
        return (
          <TaskDetailsDialog
            task={selectedTask}
            members={members}
            currentMember={currentMember}
            onClose={() => setSelectedTaskId(null)}
            onUpdateStatus={onUpdateTaskStatus}
            onAddComment={onAddComment}
            onUpdateSubtasks={onUpdateSubtasks}
            onUpdateDetails={onUpdateTaskDetails}
            loading={loading}
          />
        );
      })()}

    </div>
  );
}
