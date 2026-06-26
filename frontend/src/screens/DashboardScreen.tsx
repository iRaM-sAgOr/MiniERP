import React, { useState } from 'react';
import {
  Briefcase, Inbox, CheckCircle2, RefreshCw, HelpCircle, UserPlus, LogOut
} from 'lucide-react';
import PunchCard from '../components/PunchCard';
import WorkLogForm from '../components/WorkLogForm';
import EmailDraftCard from '../components/EmailDraftCard';
import TeamDashboard from '../components/TeamDashboard';
import TaskAllocator from '../components/TaskAllocator';
import ProfileManagement from '../components/ProfileManagement';
import MessagesPanel from '../components/MessagesPanel';
import SentEmailsPanel from '../components/SentEmailsPanel';
import RegistrationFormCard from '../components/RegistrationFormCard';
import { TeamMember, PunchRecord, WorkLog, TaskDistribution, LogItem, DirectMessage, EnterpriseProject, AttendanceData, DayAttendanceRow, TaskListQuery, TaskListResult, MessageContact, OnlineMessageUser, SentEmailLogPage } from '../types';
import { ActiveTab, Screen } from '../hooks/useErpState';
// @ts-ignore
import aiLogo from '../assets/images/ai_solution_usa_logo_1780158886266.png';

interface DashboardScreenProps {
  // Data
  members: TeamMember[];
  punches: PunchRecord[];
  worklogs: WorkLog[];
  tasks: TaskDistribution[];
  sentEmailsLog: SentEmailLogPage | null;
  messages: DirectMessage[];
  messageContacts: MessageContact[];
  onlineMessageUsers: OnlineMessageUser[];
  projects: EnterpriseProject[];
  managerProjects: EnterpriseProject[];

  // Auth
  authRoleType: string;
  authMemberId: string;
  currentMemberId: string;
  managerViewMode: 'manager' | 'engineer';

  // Derived
  currentMember: TeamMember;
  effectiveMember: TeamMember;
  effectiveRoleType: TeamMember['roleType'];
  teamLeads: TeamMember[];
  todayStr: string;
  activeWorklog: WorkLog | null;
  attendance: AttendanceData | null;
  activeShiftAttendees: number;
  breakShiftAttendees: number;
  submittedLogsTodayCount: number;

  // Loading
  dataLoading: boolean;
  punchLoading: boolean;
  logLoading: boolean;
  emailLoading: boolean;
  taskLoading: boolean;
  projectLoading: boolean;
  profileLoading: boolean;
  authLoading: boolean;

  // UI
  activeTab: ActiveTab;
  systemAlert: { type: 'success' | 'error' | 'info'; text: string } | null;
  unseenSenders: Map<string, number>;

  // Setters
  setActiveTab: (tab: ActiveTab) => void;
  setCurrentMemberId: (id: string) => void;
  setCurrentScreen: (s: Screen) => void;
  setManagerViewMode: (m: 'manager' | 'engineer') => void;
  setMessages: React.Dispatch<React.SetStateAction<DirectMessage[]>>;

  // Handlers
  socketRef: React.MutableRefObject<any>;
  triggerAlert: (type: 'success' | 'error' | 'info', text: string) => void;
  handleProfileSwitch: (id: string) => void;
  handlePunch: (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => Promise<void>;
  handleAppendWorklogItem: (item: LogItem, tlId: string) => Promise<void>;
  handleDeleteWorklogItem: (worklogId: string, itemId: string) => Promise<void>;
  handleSendEmail: (worklogId: string | undefined, subject: string, body: string, recipientId: string) => Promise<void>;
  handleAssignTask: (taskData: any) => Promise<void>;
  handleCreateProject: (name: string, description: string) => Promise<void>;
  handleUpdateProject: (projectId: string, payload: {
    name?: string;
    description?: string;
    githubRepoUrl?: string;
    notionUrl?: string;
    milestonePlan?: string;
    standardChecklist?: string;
    releasePlanUrl?: string;
    status?: 'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive';
  }) => Promise<void>;
  handleDeleteProject: (id: string) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleUpdateTaskSubtasks: (taskId: string, subtasks: any[]) => Promise<void>;
  handleUpdateTaskDetails: (taskId: string, updates: any) => Promise<void>;
  handleRegisterUser: (userData: any) => Promise<void>;
  handleUpdateUserRole: (userId: string, roleType: 'Engineer' | 'Manager') => Promise<void>;
  handleUpdateProfile: (profileData: any) => Promise<void>;
  handleManagerGeneratePasswordReset: (memberId: string) => Promise<any>;
  handleSendMessage: (receiverId: string, text: string, socketRef: React.MutableRefObject<any>) => Promise<void>;
  handleLogout: () => void;
  refetchAll: () => void;
  onFetchMessageContacts: () => Promise<void>;
  onFetchConversationMessages: (contactId: string) => Promise<void>;
  onFetchSentEmailLogs: (dayPage?: number, dayWindow?: number) => Promise<void>;
  onFetchTasks: (query?: TaskListQuery) => Promise<TaskListResult>;
  onFetchAttendanceMonth: (memberId: string, year: number, month: number) => Promise<DayAttendanceRow[]>;
}

export default function DashboardScreen(props: DashboardScreenProps) {
  const {
    members, punches, worklogs, tasks, sentEmailsLog, messages, messageContacts, onlineMessageUsers, projects, managerProjects,
    authRoleType, authMemberId, currentMemberId, managerViewMode,
    currentMember, effectiveMember, effectiveRoleType,
    teamLeads, todayStr, attendance, activeWorklog,
    activeShiftAttendees, breakShiftAttendees, submittedLogsTodayCount,
    dataLoading, punchLoading, logLoading, emailLoading,
    taskLoading, projectLoading, profileLoading, authLoading,
    activeTab, systemAlert, unseenSenders,
    setActiveTab, setCurrentMemberId, setCurrentScreen, setManagerViewMode, setMessages,
    socketRef, triggerAlert,
    handleProfileSwitch, handlePunch, handleAppendWorklogItem, handleDeleteWorklogItem, handleSendEmail,
    handleAssignTask, handleCreateProject, handleUpdateProject, handleDeleteProject,
    handleUpdateTaskStatus, handleAddTaskComment, handleUpdateTaskSubtasks,
    handleUpdateTaskDetails, handleRegisterUser, handleUpdateUserRole,
    handleUpdateProfile, handleManagerGeneratePasswordReset,
    handleSendMessage, handleLogout, refetchAll,
    onFetchMessageContacts, onFetchConversationMessages, onFetchSentEmailLogs,
    onFetchTasks, onFetchAttendanceMonth,
  } = props;

  const [showRegForm, setShowRegForm] = useState(false);
  const [selectedChatUserId, setSelectedChatUserId] = useState('');
  const [typedMessage, setTypedMessage] = useState('');
  const [sentLogsDayPage, setSentLogsDayPage] = useState(1);

  const totalUnseen = Array.from(unseenSenders.values()).reduce((s, n) => s + n, 0);
  const punchesForToday = punches
    .filter(p => p.userId === effectiveMember.id && p.date === todayStr)
    .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

  const handleSelectChatUser = (id: string) => {
    setSelectedChatUserId(id);
    onFetchConversationMessages(id);
    // Clear unseen for that sender
    setMessages(prev => prev); // trigger re-render; actual clearing happens via unseenSenders in App
  };

  React.useEffect(() => {
    if (activeTab === 'messages') {
      onFetchMessageContacts();
    }
  }, [activeTab, onFetchMessageContacts]);

  React.useEffect(() => {
    if (activeTab === 'sentLogs') {
      onFetchSentEmailLogs(sentLogsDayPage, 5);
    }
  }, [activeTab, sentLogsDayPage, onFetchSentEmailLogs]);

  React.useEffect(() => {
    if (!selectedChatUserId && messageContacts.length > 0 && activeTab === 'messages') {
      const firstContactId = messageContacts[0].contactId;
      setSelectedChatUserId(firstContactId);
      onFetchConversationMessages(firstContactId);
    }
  }, [activeTab, messageContacts, selectedChatUserId, onFetchConversationMessages]);

  return (
    <div className="min-h-screen bg-[#fbfaf5] text-[#3d403a] flex flex-col antialiased font-sans" id="remote-erp-root-panel">
      {/* Toast */}
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

      {/* Header */}
      <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-3.5 px-3 sm:px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2.5 justify-center lg:justify-start">
            <img src={aiLogo} alt="AI Solution USA Logo" className="w-10 h-10 rounded-xl object-contain border border-[#e2dfd2] bg-white pointer-events-none p-0.5" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">AI Solution USA</h1>
              <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Enterprise Portal</span>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            {/* Acting as selector */}
            <div className="w-full sm:w-auto flex items-center gap-2 bg-white border border-[#e2dfd2] rounded-xl px-3 py-1.5 min-h-9">
              <span className="text-[10px] uppercase font-bold text-[#5a6e53] font-mono">Acting As:</span>
              {members.length > 0 ? (
                authRoleType === 'Manager' && managerViewMode === 'manager' ? (
                  <select className="bg-transparent border-none text-xs font-bold text-[#3d403a] focus:outline-none cursor-pointer py-0 pl-0 pr-6 max-w-[190px] truncate" value={currentMemberId} onChange={e => handleProfileSwitch(e.target.value)} disabled={dataLoading}>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-[#3d403a] select-none truncate max-w-[190px]">{currentMember.name} ({currentMember.role})</span>
                )
              ) : (
                <span className="text-xs text-slate-400 font-bold">Loading roster...</span>
              )}
            </div>

            <div className="w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1.5">
              <button onClick={() => setCurrentScreen('home')} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] text-[#5a6e53] rounded-xl text-xs font-bold cursor-pointer min-h-9">
                <HelpCircle className="w-3.5 h-3.5" />
                Home
              </button>
              {authRoleType === 'Manager' && (
                <button
                  onClick={() => {
                    const next = managerViewMode === 'manager' ? 'engineer' : 'manager';
                    setManagerViewMode(next);
                    if (next === 'engineer' && authMemberId) { setCurrentMemberId(authMemberId); setShowRegForm(false); }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold cursor-pointer min-h-9 ${managerViewMode === 'engineer' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                  {managerViewMode === 'engineer' ? '👷 Engineer View' : '📊 Manager View'}
                </button>
              )}
              {authRoleType === 'Manager' && managerViewMode === 'manager' && (
                <button onClick={() => setShowRegForm(!showRegForm)} className={`flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold cursor-pointer min-h-9 ${showRegForm ? 'bg-[#5a6e53] text-white border-[#5a6e53]' : 'bg-[#d4a373] hover:opacity-90 text-white border-[#d4a373]'}`}>
                  <UserPlus className="w-3.5 h-3.5" />
                  {showRegForm ? 'Close Registration' : 'Register Employee'}
                </button>
              )}
              <button onClick={refetchAll} disabled={dataLoading} className="flex items-center justify-center p-2 border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] text-[#5a6e53] rounded-xl cursor-pointer min-h-9">
                <RefreshCw className={`w-3.5 h-3.5 ${dataLoading ? 'animate-spin text-slate-400' : ''}`} />
              </button>
              <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold cursor-pointer min-h-9">
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics band */}
      <section className="bg-white border-b border-[#e2dfd2] px-6 py-4">
        {effectiveRoleType === 'Manager' ? (
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricBadge label="Attendees Clocked in" value={`${activeShiftAttendees} Online`} valueClass="text-emerald-700" right={<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />} />
            <MetricBadge label="Attendees on Break" value={`${breakShiftAttendees} Active`} valueClass="text-amber-700" right={<div className="w-2.5 h-2.5 rounded-full bg-amber-400" />} />
            <MetricBadge label="Completed Workbooks" value={`${submittedLogsTodayCount} logged`} right={<Inbox className="w-4 h-4 text-[#5a6e53]" />} />
            <MetricBadge label="Task Allocations" value={`${tasks.length} Assigned`} right={<CheckCircle2 className="w-4 h-4 text-[#5a6e53]" />} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricBadge label="My Attendance State" value={currentMember.punchStatus || 'Offline'} valueClass="text-emerald-700" right={<div className={`w-2.5 h-2.5 rounded-full ${currentMember.punchStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : currentMember.punchStatus === 'Break' ? 'bg-amber-400' : 'bg-slate-400'}`} />} />
            <MetricBadge label="My Pending Tasks" value={`${tasks.filter(t => t.assignedTo === currentMemberId && t.status !== 'Completed').length} Pending`} valueClass="text-amber-700" right={<CheckCircle2 className="w-4 h-4 text-[#5a6e53]" />} />
            <MetricBadge label="My Arrangement Commitment" value={`${currentMember.agreementHours || 20} hrs/week`} right={<Inbox className="w-4 h-4 text-[#5a6e53]" />} />
            <MetricBadge label="My Work Log Today" value={activeWorklog ? 'Completed' : 'Pending'} right={<Briefcase className="w-4 h-4 text-[#5a6e53]" />} />
          </div>
        )}
      </section>

      {/* Main content */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 space-y-6">
        {showRegForm && (
          <RegistrationFormCard
            authLoading={authLoading}
            onRegister={handleRegisterUser}
            onClose={() => setShowRegForm(false)}
          />
        )}

        {dataLoading && members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <svg className="animate-spin h-8 w-8 text-[#5a6e53]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-mono text-[#5a6e53] font-bold uppercase tracking-widest animate-pulse">Establishing ERP database tunnels...</p>
          </div>
        ) : (
          <>
            {/* Top grid: punch + worklog + email */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Profile indicator */}
                <div className="bg-white border border-[#e2dfd2] rounded-3xl p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={currentMember.avatar} alt={currentMember.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#e2dfd2]" referrerPolicy="no-referrer" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-[#2d3a2a] tracking-tight leading-none">{currentMember.name}</h2>
                        <span className="text-[9px] bg-[#5a6e53] font-bold uppercase text-white px-2 py-0.5 rounded-lg font-mono">Acting ERP Profile</span>
                      </div>
                      <p className="text-xs text-[#7a7d75] mt-1">{currentMember.role} · <span className="font-semibold text-[#5a6e53]">{currentMember.department}</span></p>
                    </div>
                  </div>
                  <div className="bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-xl px-4 py-2 text-right">
                    <span className="text-[9px] uppercase font-bold text-[#5a6e53] block font-mono">Today&apos;s Date</span>
                    <span className="text-xs font-mono font-bold text-[#3d403a]">{todayStr}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <PunchCard currentMember={effectiveMember} punchesForToday={punchesForToday} todayWorkedMinutes={attendance?.self.todayWorkedMinutes ?? 0} isClockedOut={attendance?.self.isClockedOut ?? false} onPunch={handlePunch} loading={punchLoading} />
                  <WorkLogForm currentMember={effectiveMember} teamLeads={teamLeads} savedWorkLog={activeWorklog} onAppendItem={handleAppendWorklogItem} onDeleteWorklogItem={handleDeleteWorklogItem} onSearchTasks={onFetchTasks} loading={logLoading} projects={projects} />
                </div>
              </div>

              <div className="lg:col-span-1">
                <EmailDraftCard worklog={activeWorklog} currentMember={effectiveMember} members={members} onSendEmail={handleSendEmail} loading={emailLoading} />
              </div>
            </div>

            {/* Bottom section: tabs */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-[#e2dfd2] pb-2">
                <h3 className="font-bold text-[#2d3a2a] text-sm uppercase tracking-wider font-serif">Enterprise Work & Backlog Distributions</h3>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 mb-2 bg-white border border-[#e2dfd2] rounded-2xl p-2.5">
                <div className="flex gap-1.5 flex-wrap">
                  {(['roster', 'allocator', 'messages', 'sentLogs', 'profile'] as const).map(tab => {
                    let label = '';
                    if (tab === 'roster') label = 'Roster & Backlog';
                    else if (tab === 'allocator') label = effectiveRoleType === 'Manager' ? 'Distribute Task List (Manager Mode)' : 'Self-Assign Tasks';
                    else if (tab === 'messages') label = 'Direct Messages (Chat)';
                    else if (tab === 'sentLogs') label = 'Email Receipts Log';
                    else label = 'My Profile';

                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === tab ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'}`}
                      >
                        {label}
                        {tab === 'messages' && totalUnseen > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 leading-none">
                            {totalUnseen > 99 ? '99+' : totalUnseen}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {activeTab === 'roster' && (
                <TeamDashboard
                  currentMember={effectiveMember}
                  members={members}
                  tasks={tasks}
                  worklogs={worklogs}
                  attendance={attendance ?? undefined}
                  onFetchAttendanceMonth={onFetchAttendanceMonth}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onAddComment={handleAddTaskComment}
                  onUpdateSubtasks={handleUpdateTaskSubtasks}
                  onUpdateTaskDetails={handleUpdateTaskDetails}
                  loading={taskLoading}
                  onUpdateUserRole={handleUpdateUserRole}
                  onGeneratePasswordResetToken={handleManagerGeneratePasswordReset}
                  onFetchTasks={onFetchTasks}
                />
              )}

              {activeTab === 'allocator' && (
                <TaskAllocator
                  currentMember={effectiveMember}
                  members={members}
                  projects={projects}
                  managerProjects={managerProjects}
                  onAssignTask={handleAssignTask}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  loading={taskLoading || projectLoading}
                />
              )}

              {activeTab === 'messages' && (
                <MessagesPanel
                  currentMember={effectiveMember}
                  members={members}
                  contacts={messageContacts}
                  onlineUsers={onlineMessageUsers}
                  messages={messages}
                  unseenSenders={unseenSenders}
                  selectedChatUserId={selectedChatUserId}
                  typedMessage={typedMessage}
                  onSelectUser={handleSelectChatUser}
                  onTypedMessageChange={setTypedMessage}
                  onSend={(receiverId, text) => handleSendMessage(receiverId, text, socketRef)}
                />
              )}

              {activeTab === 'sentLogs' && (
                <SentEmailsPanel
                  sentEmailsLog={sentEmailsLog}
                  currentMember={effectiveMember}
                  currentMemberId={currentMemberId}
                  members={members}
                  effectiveRoleType={effectiveRoleType}
                  dayPage={sentLogsDayPage}
                  onPrevDayPage={() => setSentLogsDayPage(prev => Math.max(1, prev - 1))}
                  onNextDayPage={() => setSentLogsDayPage(prev => Math.min(sentEmailsLog?.pagination?.totalDayPages || prev, prev + 1))}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileManagement
                  currentMember={effectiveMember}
                  loading={profileLoading}
                  onUpdateProfile={handleUpdateProfile}
                />
              )}
            </section>
          </>
        )}
      </main>

      <footer className="bg-transparent border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
        <span>&copy; 2026 AI Solution USA. All rights reserved.</span>
      </footer>
    </div>
  );
}

function MetricBadge({ label, value, valueClass = 'text-[#3d403a]', right }: { label: string; value: string; valueClass?: string; right: React.ReactNode }) {
  return (
    <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
      <div>
        <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">{label}</span>
        <span className={`text-base font-bold block mt-0.5 ${valueClass}`}>{value}</span>
      </div>
      {right}
    </div>
  );
}
