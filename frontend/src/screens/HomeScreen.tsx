import React from 'react';
import {
  Briefcase, Users, Clock, ShieldCheck, MessageSquare, FolderSync, LogOut, LayoutGrid
} from 'lucide-react';
import { TeamMember, WorkLog } from '../types';
import { ActiveTab, Screen } from '../hooks/useErpState';
// @ts-ignore
import aiLogo from '../assets/images/ai_solution_usa_logo_1780158886266.png';

interface HomeScreenProps {
  currentMember: TeamMember;
  effectiveMember: TeamMember;
  effectiveRoleType: TeamMember['roleType'];
  authRoleType: string;
  managerViewMode: 'manager' | 'engineer';
  todayStr: string;
  activeWorklog: WorkLog | null;
  activeShiftAttendees: number;
  breakShiftAttendees: number;
  submittedLogsTodayCount: number;
  tasks: any[];
  currentMemberId: string;
  unseenCount: number;
  systemAlert: { type: 'success' | 'error' | 'info'; text: string } | null;
  onSetScreen: (s: Screen) => void;
  onSetActiveTab: (t: ActiveTab) => void;
  onToggleManagerViewMode: () => void;
  onLogout: () => void;
}

export default function HomeScreen({
  currentMember,
  effectiveRoleType,
  authRoleType,
  managerViewMode,
  todayStr,
  activeWorklog,
  activeShiftAttendees,
  breakShiftAttendees,
  submittedLogsTodayCount,
  tasks,
  currentMemberId,
  unseenCount,
  systemAlert,
  onSetScreen,
  onSetActiveTab,
  onToggleManagerViewMode,
  onLogout,
}: HomeScreenProps) {
  const pendingTasks = tasks.filter(t => t.assignedTo === currentMemberId && t.status !== 'Completed').length;

  const goTo = (tab?: ActiveTab) => {
    if (tab) onSetActiveTab(tab);
    onSetScreen('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#fbfaf5] text-[#3d403a] flex flex-col antialiased font-sans">
      {systemAlert && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-xs font-semibold animate-bounce max-w-sm ${
          systemAlert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : systemAlert.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800'
          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${systemAlert.type === 'success' ? 'bg-emerald-500' : systemAlert.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'}`} />
          {systemAlert.text}
        </div>
      )}

      <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-3.5 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <img src={aiLogo} alt="AI Solution USA" className="w-10 h-10 rounded-xl object-contain border border-[#e2dfd2] bg-white p-0.5" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">AI Solution USA</h1>
              <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Enterprise Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {authRoleType === 'Manager' && (
              <button onClick={onToggleManagerViewMode} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${managerViewMode === 'engineer' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>
                {managerViewMode === 'engineer' ? '👷 Engineer View' : '📊 Manager View'}
              </button>
            )}
            <button onClick={() => onSetScreen('dashboard')} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#5a6e53] text-white text-xs font-bold rounded-xl hover:opacity-90 cursor-pointer">
              <LayoutGrid className="w-3.5 h-3.5" />
              Enter Dashboard
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-6 flex-1 space-y-8">
        {/* Welcome banner */}
        <section className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <img src={currentMember.avatar} alt={currentMember.name} className="w-16 h-16 rounded-full object-cover border-2 border-[#e2dfd2]" referrerPolicy="no-referrer" />
          <div className="flex-1">
            <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-[#5a6e53]">Welcome back</p>
            <h2 className="text-2xl font-bold font-serif text-[#2d3a2a] leading-tight">{currentMember.name}</h2>
            <p className="text-xs text-[#7a7d75] mt-1">{currentMember.role} · <span className="font-semibold text-[#5a6e53]">{currentMember.department}</span> · <span className="font-mono">{todayStr}</span></p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              currentMember.punchStatus === 'Active' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : currentMember.punchStatus === 'Break' ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentMember.punchStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : currentMember.punchStatus === 'Break' ? 'bg-amber-400' : 'bg-slate-400'}`} />
              {currentMember.punchStatus}
            </span>
            <span className="text-[10px] font-mono text-[#7a7d75]">Role: <strong className="text-[#3d403a]">{effectiveRoleType}</strong></span>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {effectiveRoleType === 'Manager' ? (
            <>
              <StatCard label="Team Online Now" value={activeShiftAttendees} sub="members clocked in" color="text-emerald-700" />
              <StatCard label="On Break" value={breakShiftAttendees} sub="members on break" color="text-amber-600" />
              <StatCard label="Worklogs Today" value={submittedLogsTodayCount} sub="submitted" color="text-[#5a6e53]" />
              <StatCard label="Total Tasks" value={tasks.length} sub="allocated" color="text-[#3d403a]" />
            </>
          ) : (
            <>
              <StatCard label="My Status" value={currentMember.punchStatus} sub="attendance" color={currentMember.punchStatus === 'Active' ? 'text-emerald-700' : 'text-slate-600'} />
              <StatCard label="Pending Tasks" value={pendingTasks} sub="awaiting action" color="text-amber-600" />
              <StatCard label="Today's Log" value={activeWorklog ? 'Done' : 'Pending'} sub="worklog" color={activeWorklog ? 'text-emerald-700' : 'text-rose-600'} />
              <StatCard label="Messages" value={unseenCount} sub="unread" color={unseenCount > 0 ? 'text-red-600' : 'text-[#3d403a]'} />
            </>
          )}
        </section>

        {/* Quick nav cards */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#7a7d75] font-mono mb-3">Quick Access</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <NavCard icon={Clock} title="Punch In / Out" desc="Manage your shift attendance and break records." onClick={() => goTo()} />
            <NavCard icon={Briefcase} title="Daily Work Log" desc="Submit your daily task log and prepare supervisor email drafts." onClick={() => goTo()} />
            <NavCard icon={MessageSquare} title="Direct Messages" desc="Peer-to-peer encrypted workspace correspondence." onClick={() => goTo('messages')} badge={unseenCount > 0 ? String(unseenCount > 99 ? '99+' : unseenCount) : undefined} />
            <NavCard icon={Users} title={effectiveRoleType === 'Manager' ? 'Team Roster' : 'Roster & Backlog'} desc={effectiveRoleType === 'Manager' ? 'Audit team schedules, roles and productivity.' : 'View your tasks and activity history.'} onClick={() => goTo('roster')} />
            <NavCard icon={ShieldCheck} title="My Profile" desc="Update your name, avatar, schedule and department." onClick={() => goTo('profile')} />
            {effectiveRoleType === 'Manager' && (
              <NavCard icon={FolderSync} title="Task Allocator" desc="Distribute and manage tasks across your engineering team." onClick={() => goTo('allocator')} accent />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
        <span>&copy; 2026 AI Solution USA. All rights reserved.</span>
        <div className="flex justify-center gap-1.5 items-center font-semibold text-[#5a6e53]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px]">Secure Session Active</span>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-[#e2dfd2] rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-[10px] text-[#7a7d75] font-bold uppercase font-mono">{label}</span>
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-400">{sub}</span>
    </div>
  );
}

function NavCard({ icon: Icon, title, desc, onClick, badge, accent }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; onClick: () => void;
  badge?: string; accent?: boolean;
}) {
  return (
    <button onClick={onClick} className="relative bg-white border border-[#e2dfd2] hover:border-[#5a6e53]/40 hover:bg-[#f4f1e8]/50 rounded-3xl p-5 text-left transition-all cursor-pointer group w-full">
      {badge && (
        <span className="absolute top-3 right-3 min-w-5 h-5 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1">{badge}</span>
      )}
      <div className={`p-2 ${accent ? 'bg-[#d4a373]/10 text-[#d4a373] group-hover:bg-[#d4a373]/20' : 'bg-[#5a6e53]/10 text-[#5a6e53] group-hover:bg-[#5a6e53]/20'} rounded-xl w-max mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-bold text-[#2d3a2a] font-serif">{title}</h4>
      <p className="text-xs text-[#7a7d75] mt-1">{desc}</p>
    </button>
  );
}
