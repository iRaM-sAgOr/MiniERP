import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  Clock,
  Mail,
  RotateCcw,
  RefreshCw,
  FolderSync,
  HelpCircle,
  Inbox,
  LayoutGrid,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import PunchCard from './components/PunchCard';
import WorkLogForm from './components/WorkLogForm';
import EmailDraftCard from './components/EmailDraftCard';
import TeamDashboard from './components/TeamDashboard';
import TaskAllocator from './components/TaskAllocator';
import { TeamMember, PunchRecord, WorkLog, TaskDistribution, LogItem } from './types';

export default function App() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<TaskDistribution[]>([]);
  const [sentEmailsLog, setSentEmailsLog] = useState<any[]>([]);
  
  const [currentMemberId, setCurrentMemberId] = useState('user-sagor');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'allocator' | 'sentLogs'>('roster');
  const [systemAlert, setSystemAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load state from fullstack database API
  const fetchState = async (showSilently = false) => {
    if (!showSilently) setLoading(true);
    try {
      const res = await fetch('/api/erp/state');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPunches(data.punches || []);
        setWorklogs(data.worklogs || []);
        setTasks(data.tasks || []);
        setSentEmailsLog(data.sentEmailsLog || []);
      }
    } catch (err) {
      console.error('Failed to query standard state:', err);
      triggerAlert('error', 'Failed to synchronize with server database. Verify Express container bindings.');
    } finally {
      if (!showSilently) setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  const triggerAlert = (type: 'success' | 'error' | 'info', text: string) => {
    setSystemAlert({ type, text });
    setTimeout(() => setSystemAlert(null), 5000);
  };

  // Switch acting profile
  const handleProfileSwitch = (id: string) => {
    setCurrentMemberId(id);
    triggerAlert('info', `Switched acting profile context on standard ERP dashboards.`);
  };

  // Trigger attendance actions
  const handlePunch = async (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/erp/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentMemberId, type, note })
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setPunches(data.state.punches);
        triggerAlert('success', `Shift state converted successfully: ${type}`);
      } else {
        triggerAlert('error', 'Server rejected shift code submission.');
      }
    } catch (err) {
      triggerAlert('error', 'Error pushing attendance logs to server.');
    } finally {
      setLoading(false);
    }
  };

  // Submit daily logs
  const handleLogSubmit = async (items: LogItem[], tlId: string) => {
    const selectedTL = members.find(m => m.id === tlId);
    const tlData = selectedTL ? { name: selectedTL.name, email: selectedTL.email } : { name: 'Sarah Connor', email: 'sarah.connor@monolith.io' };
    
    try {
      setLoading(true);
      const res = await fetch('/api/erp/worklog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentMemberId,
          items,
          assignedTL: tlData
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setWorklogs(data.state.worklogs);
        triggerAlert('success', 'Daily logs submitted! Professional TL Email draft ready in portal.');
      } else {
        triggerAlert('error', 'Server error logging metrics.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure uploading task sheets.');
    } finally {
      setLoading(false);
    }
  };

  // Dispatch TL Email (Simulate save receipt)
  const handleSendEmail = async (worklogId: string, customSubject: string, customBody: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/erp/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worklogId, customSubject, customBody })
      });
      if (res.ok) {
        const data = await res.json();
        setWorklogs(data.state.worklogs);
        setSentEmailsLog(data.state.sentEmailsLog);
        triggerAlert('success', `Daily worklog successfully disptached to Team Lead! Logging dispatch item.`);
      } else {
        triggerAlert('error', 'Simulation dispatch failure on server.');
      }
    } catch (err) {
      triggerAlert('error', 'Network error dispatching email templates.');
    } finally {
      setLoading(false);
    }
  };

  // Distribute new task
  const handleAssignTask = async (taskData: {
    title: string;
    description: string;
    assignedTo: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
  }) => {
    try {
      setLoading(true);
      const res = await fetch('/api/erp/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskData,
          assignedBy: currentMemberId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', `Published brand new work assignment to ${members.find(m => m.id === taskData.assignedTo)?.name}`);
      } else {
        triggerAlert('error', 'Task upload rejected by server ERP engine.');
      }
    } catch (err) {
      triggerAlert('error', 'Network error distributing task logs.');
    } finally {
      setLoading(false);
    }
  };

  // Update distributed task status
  const handleUpdateTaskStatus = async (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      setLoading(true);
      const res = await fetch('/api/erp/task/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', `Updated task state to status: [${status}]`);
      } else {
        triggerAlert('error', 'Failed updating backlog items.');
      }
    } catch (err) {
      triggerAlert('error', 'Task routing modification error on standard server.');
    } finally {
      setLoading(false);
    }
  };

  // Reset core database
  const handleReset = async () => {
    if (!window.confirm("Restore standard remote team databases back to baseline seed?")) return;
    try {
      setLoading(true);
      const res = await fetch('/api/erp/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setPunches(data.state.punches);
        setWorklogs(data.state.worklogs);
        setTasks(data.state.tasks);
        setSentEmailsLog(data.state.sentEmailsLog);
        setCurrentMemberId('user-sagor');
        triggerAlert('success', 'Relational database wiped & reseeded to raw default layout.');
      }
    } catch (err) {
      triggerAlert('error', 'Failed to wipe server indexes.');
    } finally {
      setLoading(false);
    }
  };

  const currentMember = members.find(m => m.id === currentMemberId) || members[0];
  const teamLeads = members.filter(m => m.isTL);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const punchesForToday = punches.filter(p => p.userId === currentMemberId && p.date === todayStr);
  const activeWorklog = worklogs.find(w => w.userId === currentMemberId && w.date === todayStr) || null;

  // Global aggregate metrics
  const activeShiftAttendees = members.filter(m => m.punchStatus === 'Active').length;
  const breakShiftAttendees = members.filter(m => m.punchStatus === 'Break').length;
  const submittedLogsTodayCount = worklogs.filter(w => w.date === todayStr).length;
  
  return (
    <div className="min-h-screen bg-[#fbfaf5] text-[#3d403a] flex flex-col antialiased font-sans" id="remote-erp-root-panel">
      {/* 1. Status Toast banner */}
      {systemAlert && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-xs font-semibold animate-bounce max-w-sm ${
          systemAlert.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : systemAlert.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`} id="erp-system-banner-notifications">
          <span className={`w-1.5 h-1.5 rounded-full ${
            systemAlert.type === 'success' ? 'bg-emerald-500' : systemAlert.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'
          }`} />
          {systemAlert.text}
        </div>
      )}

      {/* 2. Top Portal Header */}
      <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-4 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#5a6e53] rounded-xl text-white">
              <Briefcase className="w-5 h-5 leading-none" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">SyncSpace ERP</h1>
              <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Workspace Engine</span>
            </div>
          </div>

          {/* Controller selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Acting Context Profile Selector */}
            <div className="flex items-center gap-2 bg-white border border-[#e2dfd2] rounded-xl px-3 py-1.5">
              <span className="text-[10px] uppercase font-bold text-[#5a6e53] font-mono">Acting As:</span>
              {members.length > 0 && currentMember ? (
                <select
                  className="bg-transparent border-none text-xs font-bold text-[#3d403a] focus:outline-none cursor-pointer py-0 pl-0 pr-6"
                  value={currentMemberId}
                  onChange={(e) => handleProfileSwitch(e.target.value)}
                  disabled={loading}
                >
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-400 font-bold">Loading roster...</span>
              )}
            </div>

            {/* Sync DB and Seed controller */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchState(false)}
                disabled={loading}
                className="p-2 border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] text-[#5a6e53] rounded-xl transition-colors cursor-pointer"
                title="Synchronize data layers with database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-400' : ''}`} />
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                className="p-2 border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] text-[#5a6e53] rounded-xl transition-colors cursor-pointer"
                title="Reseed databases back to raw template"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 3. Global Activity Metrics Band */}
      <section className="bg-white border-b border-[#e2dfd2] px-6 py-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">Attendees Clocked in</span>
              <span className="text-base font-bold text-emerald-700 block mt-0.5">{activeShiftAttendees} Online</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
          <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">Attendees on Break</span>
              <span className="text-base font-bold text-amber-700 block mt-0.5">{breakShiftAttendees} Active</span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
          </div>
          <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">Completed Workbooks</span>
              <span className="text-base font-bold text-[#3d403a] block mt-0.5">{submittedLogsTodayCount} logged</span>
            </div>
            <Inbox className="w-4 h-4 text-[#5a6e53]" />
          </div>
          <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">Task Allocations</span>
              <span className="text-base font-bold text-[#3d403a] block mt-0.5">{tasks.length} Assigned</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-[#5a6e53]" />
          </div>
        </div>
      </section>

      {/* 4. Primary Content Board */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 space-y-6">
        
        {loading && members.length === 0 ? (
          /* Sourcing skeletons */
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <svg className="animate-spin h-8 w-8 text-[#5a6e53]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z animate-pulse" />
            </svg>
            <p className="text-xs font-mono text-[#5a6e53] font-bold uppercase tracking-widest animate-pulse">Establishing ERP database tunnels...</p>
          </div>
        ) : (
          <>
            {/* Double Segment Controllers: Left is Core ERP Panels, Right is Email Portal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column (Span 2): Attendance Punch and Daily Work Logger Forms */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visual profile indicator */}
                {currentMember && (
                  <div className="bg-white border border-[#e2dfd2] rounded-3xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentMember.avatar}
                        alt={currentMember.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#e2dfd2]"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-[#2d3a2a] tracking-tight leading-none">{currentMember.name}</h2>
                          <span className="text-[9px] bg-[#5a6e53] font-bold uppercase text-white px-2 py-0.5 rounded-lg font-mono">Acting ERP Profile</span>
                        </div>
                        <p className="text-xs text-[#7a7d75] mt-1">
                          {currentMember.role} • <span className="font-semibold text-[#5a6e53]">{currentMember.department}</span>
                        </p>
                      </div>
                    </div>
                    <div className="bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-xl px-4 py-2 text-right">
                      <span className="text-[9px] uppercase font-bold text-[#5a6e53] block font-mono">Today&apos;s Date</span>
                      <span className="text-xs font-mono font-bold text-[#3d403a]">{todayStr}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Attendance Shift Control */}
                  {currentMember && (
                    <PunchCard
                      currentMember={currentMember}
                      punchesForToday={punchesForToday}
                      onPunch={handlePunch}
                      loading={loading}
                    />
                  )}

                  {/* Daily Work Logger Form */}
                  {currentMember && (
                    <WorkLogForm
                      currentMember={currentMember}
                      teamLeads={teamLeads}
                      savedWorkLog={activeWorklog}
                      onSubmitLog={handleLogSubmit}
                      loading={loading}
                    />
                  )}
                </div>
              </div>

              {/* Right Column (Span 1): Gemini Professional Email draft Review and Send */}
              <div className="lg:col-span-1">
                <EmailDraftCard
                  worklog={activeWorklog}
                  onSendEmail={handleSendEmail}
                  loading={loading}
                />
              </div>

            </div>

            {/* Bottom Section: Teams allocations & distributes boards  */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-[#e2dfd2] pb-2">
                <h3 className="font-bold text-[#2d3a2a] text-sm uppercase tracking-wider font-serif">Enterprise Work & Backlog Distributions</h3>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 mb-2 bg-white border border-[#e2dfd2] rounded-2xl p-2.5">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveTab('roster')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'roster' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                    }`}
                  >
                    Roster & Backlog
                  </button>
                  <button
                    onClick={() => setActiveTab('allocator')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'allocator' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                    }`}
                  >
                    Distribute Task List
                  </button>
                  <button
                    onClick={() => setActiveTab('sentLogs')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'sentLogs' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                    }`}
                  >
                    Email Receipts Log
                  </button>
                </div>
              </div>

              {activeTab === 'roster' && (
                <TeamDashboard
                  members={members}
                  tasks={tasks}
                  worklogs={worklogs}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  loading={loading}
                />
              )}

              {activeTab === 'allocator' && currentMember && (
                <TaskAllocator
                  currentMember={currentMember}
                  members={members}
                  onAssignTask={handleAssignTask}
                  loading={loading}
                />
              )}

              {activeTab === 'sentLogs' && (
                <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2] mb-4">
                    <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">TL Dispatch & Send Log Index</h3>
                    <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] px-2.5 py-0.5 rounded-lg border border-[#e2dfd2]/60">Total sent: {sentEmailsLog.length}</span>
                  </div>

                  {sentEmailsLog.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/20">
                      <p className="text-[#7a7d75] text-xs font-semibold">No simulated emails pushed yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                      {sentEmailsLog.map((log: any) => {
                        const sender = members.find(m => m.id === log.senderId);
                        return (
                          <div key={log.id} className="p-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl text-left hover:bg-[#f4f1e8]/30 transition-colors">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-[#3d403a] leading-tight">{log.subject}</h4>
                                <p className="text-[11px] text-[#7a7d75] mt-0.5">
                                  From {sender?.name || 'Unknown'} to {log.receiverName} (&lt;{log.receiverEmail}&gt;)
                                </p>
                              </div>
                              <span className="bg-[#f4f1e8] text-[#5a6e53] text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-[#e2dfd2]/60">
                                Dispatched Successfully
                              </span>
                            </div>
                            <pre className="mt-2 p-2 bg-[#fdfcf8] border border-[#e2dfd2]/60 rounded-xl text-[10px] text-[#3d403a] font-sans whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                              {log.body}
                            </pre>
                            <span className="block text-right text-[9px] text-[#7a7d75] font-mono mt-1 font-bold">
                              Time: {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 5. Clean footer */}
      <footer className="bg-transparent border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
        <span>&copy; 2026 SyncSpace ERP. Secure, containerized workspace environment.</span>
        <div className="flex justify-center gap-1.5 items-center font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5a6e53]" />
          <span className="text-[11px]">Sandboxed server proxying in port 3000 online.</span>
        </div>
      </footer>
    </div>
  );
}
