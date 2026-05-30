import React, { useState } from 'react';
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

interface TeamDashboardProps {
  currentMember: TeamMember;
  members: TeamMember[];
  tasks: TaskDistribution[];
  worklogs: WorkLog[];
  onUpdateTaskStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  loading: boolean;
  onUpdateUserRole?: (userId: string, roleType: 'Engineer' | 'Manager') => Promise<void>;
}

export default function TeamDashboard({
  currentMember,
  members,
  tasks,
  worklogs,
  onUpdateTaskStatus,
  loading,
  onUpdateUserRole
}: TeamDashboardProps) {
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const isManager = currentMember.roleType === 'Manager';

  // Days of the week representing break times
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

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

  const handleRoleTypeChange = async (userId: string, newRoleType: 'Engineer' | 'Manager') => {
    if (!onUpdateUserRole) return;
    setRoleChangingId(userId);
    try {
      await onUpdateUserRole(userId, newRoleType);
    } finally {
      setRoleChangingId(null);
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
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-4 rounded-xl text-center">
                  <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">My Previous Working Hours</span>
                  <span className="text-2xl font-bold text-[#5a6e53] block mt-1 font-mono">{totalMyHours} Hours</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Summed across all logged tasks</span>
                </div>

                <div className="bg-[#f4f1e8]/30 border border-[#e2dfd2] p-4 rounded-xl text-center">
                  <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block font-mono">Weekly Agreement</span>
                  <span className="text-2xl font-bold text-[#5a6e53] block mt-1 font-mono">{currentMember.agreementHours || 20} hrs/week</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Approved in system setting</span>
                </div>
              </div>

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

            return (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {queriedTasks.map((task) => {
                  const assignedToMember = members.find(m => m.id === task.assignedTo);
                  const assignedByMember = members.find(m => m.id === task.assignedBy);
                  
                  return (
                    <div key={task.id} className="p-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl hover:bg-[#f4f1e8]/30 transition-colors space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 text-left flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {task.projectName && (
                              <span className="text-[9px] bg-emerald-50 text-[#5a6e53] font-extrabold font-mono px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider">
                                📂 {task.projectName}
                              </span>
                            )}
                            {task.priority === 'High' && (
                              <ArrowUpCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" title="High Priority" />
                            )}
                            {task.priority === 'Medium' && (
                              <Minus className="w-3.5 h-3.5 text-amber-500 shrink-0 bg-amber-50 rounded-full border border-amber-300" title="Medium Priority" />
                            )}
                            {task.priority === 'Low' && (
                              <ArrowDownCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" title="Low Priority" />
                            )}
                            <h4 className="text-xs font-extrabold text-[#3d403a] leading-tight truncate">{task.title}</h4>
                          </div>
                          <p className="text-[11px] text-[#7a7d75] whitespace-normal leading-relaxed">{task.description}</p>
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getPriorityBadgeColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getStatusBadgeColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      </div>

                      {/* Timelines and Scope actual hours tracking metrics */}
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

                      {/* Quick States Controller of tasks (Engineers can change status of tasks assigned to them) */}
                      <div className="flex justify-end gap-1 px-1 pt-1">
                        {task.status !== 'Pending' && (
                          <button
                            onClick={() => onUpdateTaskStatus(task.id, 'Pending')}
                            disabled={loading}
                            className="text-[9px] border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] px-2 py-0.5 text-[#3d403a] rounded font-semibold transition-colors cursor-pointer"
                          >
                            Mark Pending
                          </button>
                        )}
                        {task.status !== 'In Progress' && (
                          <button
                            onClick={() => onUpdateTaskStatus(task.id, 'In Progress')}
                            disabled={loading}
                            className="text-[9px] border border-[#d4a373]/30 bg-[#f4f1e8] hover:opacity-90 px-2 py-0.5 text-[#d4a373] rounded font-bold transition-colors cursor-pointer"
                          >
                            In Progress
                          </button>
                        )}
                        {task.status !== 'Completed' && (
                          <button
                            onClick={() => onUpdateTaskStatus(task.id, 'Completed')}
                            disabled={loading}
                            className="text-[9px] bg-[#5a6e53] hover:opacity-90 px-2.5 py-0.5 text-white rounded font-bold transition-colors cursor-pointer shadow-xs"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
  );
}
