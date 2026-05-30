import React from 'react';
import { Users, ClipboardList, CheckCircle2, CircleAlert, Sparkles, User, Calendar, CircleDot } from 'lucide-react';
import { TeamMember, TaskDistribution, WorkLog } from '../types';

interface TeamDashboardProps {
  members: TeamMember[];
  tasks: TaskDistribution[];
  worklogs: WorkLog[];
  onUpdateTaskStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  loading: boolean;
}

export default function TeamDashboard({
  members,
  tasks,
  worklogs,
  onUpdateTaskStatus,
  loading
}: TeamDashboardProps) {

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="erp-team-dashboard-bento">
      
      {/* 1. Team Status Grid Card */}
      <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2dfd2]">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">Remote Team Roster</h3>
                <p className="text-xs text-[#7a7d75]">Current status and activity tracking</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#5a6e53] font-mono bg-[#f4f1e8] px-2.5 py-0.5 rounded-full border border-[#e2dfd2]/50">
              {members.length} Active
            </span>
          </div>

          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {members.map((member) => {
              const memberLog = worklogs.find(wl => wl.userId === member.id);
              return (
                <div key={member.id} className="flex items-center justify-between p-3 bg-[#f4f1e8]/30 border border-[#e2dfd2] rounded-xl hover:bg-[#f4f1e8]/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#e2dfd2]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#3d403a] leading-none">{member.name}</h4>
                        {member.isTL && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-[#d4a373] text-white rounded scale-[0.9]">
                            TL
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#7a7d75] mt-1">{member.role} • <span className="font-semibold text-[#5a6e53]">{member.department}</span></p>
                      
                      {memberLog && memberLog.aiSummarized && (
                        <div className="mt-2 text-[10px] bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1 text-[#3d403a] italic max-w-[280px]">
                          📢 Log status: {memberLog.aiSummarized}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right space-y-1.5 flex flex-col items-end">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getMemberStatusBadge(member.punchStatus)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        member.punchStatus === 'Active' ? 'bg-emerald-500' : member.punchStatus === 'Break' ? 'bg-amber-500' : member.punchStatus === 'ClockedOut' ? 'bg-slate-500' : 'bg-slate-300'
                      }`} />
                      {member.punchStatus}
                    </span>
                    
                    {member.lastPunchTime && (
                      <span className="block text-[10px] font-mono text-[#7a7d75] font-semibold">
                        Last event: {new Date(member.lastPunchTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Task Allocation & Backlog Cards */}
      <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2dfd2]">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">Task Allocations</h3>
                <p className="text-xs text-[#7a7d75]">Team tasks distributed under ERP management</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#5a6e53] font-mono bg-[#f4f1e8] px-2.5 py-0.5 rounded-full border border-[#e2dfd2]/50">
              {tasks.length} Assigned
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/10">
              <p className="text-[#7a7d75] text-xs">No distributed tasks in remote backlog. Assign work items!</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {tasks.map((task) => {
                const assignedToMember = members.find(m => m.id === task.assignedTo);
                const assignedByMember = members.find(m => m.id === task.assignedBy);
                
                return (
                  <div key={task.id} className="p-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl hover:bg-[#f4f1e8]/30 transition-colors space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-[#3d403a] leading-tight">{task.title}</h4>
                        <p className="text-[11px] text-[#7a7d75]">{task.description}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getPriorityBadgeColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-lg ${getStatusBadgeColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[#e2dfd2]/40 text-[10px] gap-2">
                      <div className="flex items-center gap-3">
                        {assignedToMember && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="text-[#7a7d75] font-mono uppercase text-[9px]">Assignee:</span>
                            <span className="font-bold text-[#3d403a]">{assignedToMember.name}</span>
                          </div>
                        )}
                        {assignedByMember && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="text-[#7a7d75] font-mono uppercase text-[9px]">By:</span>
                            <span className="font-semibold text-slate-500">{assignedByMember.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[#7a7d75] flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#5a6e53]" />
                        <span className="font-mono">Due: {task.dueDate}</span>
                      </div>
                    </div>

                    {/* Quick States Controller of tasks */}
                    <div className="flex justify-end gap-1.5 px-1.5 pt-1">
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
          )}
        </div>
      </div>

    </div>
  );
}
