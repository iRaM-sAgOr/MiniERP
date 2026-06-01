import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  MessageSquare,
  Send,
  UserPlus,
  LogOut
} from 'lucide-react';
import PunchCard from './components/PunchCard';
import WorkLogForm from './components/WorkLogForm';
import EmailDraftCard from './components/EmailDraftCard';
import TeamDashboard from './components/TeamDashboard';
import TaskAllocator from './components/TaskAllocator';
import { getChatSocket, setChatSocketAuthToken } from './socket/chatSocket';
// @ts-ignore
import aiLogo from './assets/images/ai_solution_usa_logo_1780158886266.png';
import { TeamMember, PunchRecord, WorkLog, TaskDistribution, LogItem, DirectMessage, EnterpriseProject } from './types';

const upsertMessage = (current: DirectMessage[], incoming: any): DirectMessage[] => {
  const normalized: DirectMessage = {
    id: incoming.id,
    senderId: incoming.senderId,
    receiverId: incoming.receiverId,
    senderName: incoming.senderName,
    text: incoming.text || incoming.content || '',
    timestamp: incoming.timestamp,
  };

  const existingIndex = current.findIndex(m => m.id === normalized.id);
  if (existingIndex >= 0) {
    const next = [...current];
    next[existingIndex] = normalized;
    return next;
  }

  return [...current, normalized];
};

export default function App() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '';
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<TaskDistribution[]>([]);
  const [sentEmailsLog, setSentEmailsLog] = useState<any[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [projects, setProjects] = useState<EnterpriseProject[]>([]);
  const [authToken, setAuthToken] = useState<string>(() => localStorage.getItem('syncspace_auth_token') || '');
  const [authRoleType, setAuthRoleType] = useState<string>(() => localStorage.getItem('syncspace_auth_role_type') || '');
  
  const [currentMemberId, setCurrentMemberId] = useState<string>(() => localStorage.getItem('syncspace_auth_token') ? (localStorage.getItem('syncspace_current_member_id') || '') : '');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roster' | 'allocator' | 'messages' | 'sentLogs'>('roster');
  const [systemAlert, setSystemAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auth & Landing layout states
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  // Direct Message selected conversation & thread typing state
  const [selectedChatUserId, setSelectedChatUserId] = useState<string>('');
  const [typedMessage, setTypedMessage] = useState<string>('');
  const chatSocketRef = useRef<ReturnType<typeof getChatSocket> | null>(null);

  // Registration overlay settings state
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Remote System Engineer');
  const [regDept, setRegDept] = useState<'Engineering' | 'Product' | 'Design' | 'Marketing'>('Engineering');
  const [regHours, setRegHours] = useState(20);
  const [regBreak, setRegBreak] = useState('Friday');

  const resolveApiPath = (value: RequestInfo | URL) => {
    if (typeof value !== 'string') return value;
    if (!value.startsWith('/api/erp/')) return value;

    const suffix = value.slice('/api/erp/'.length);
    if (suffix === 'login' || suffix === 'register') {
      return `/api/auth/${suffix}`;
    }

    const routeScope = authRoleType === 'Manager' ? 'manager' : 'engineer';
    return `/api/${routeScope}/${suffix}`;
  };

  const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});
    const token = authToken || localStorage.getItem('syncspace_auth_token') || '';

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const resolved = resolveApiPath(input);
    const requestTarget = typeof resolved === 'string' && resolved.startsWith('/api/')
      ? `${apiBaseUrl}${resolved}`
      : resolved;

    return fetch(requestTarget, { ...init, headers });
  };

  // Load state from fullstack database API
  const fetchState = async (showSilently = false) => {
    if (!authToken) {
      if (!showSilently) {
        setLoading(false);
      }
      return;
    }

    if (!showSilently) setLoading(true);
    try {
      const res = await apiFetch('/api/erp/state');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPunches(data.punches || []);
        setWorklogs(data.worklogs || []);
        setTasks(data.tasks || []);
        setSentEmailsLog(data.sentEmailsLog || []);
        setMessages(data.messages || []);
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to query standard state:', err);
    } finally {
      if (!showSilently) setLoading(false);
    }
  };

  useEffect(() => {
    const socket = getChatSocket();
    chatSocketRef.current = socket;
    setChatSocketAuthToken(authToken);

    const handleIncomingMessage = (message: DirectMessage) => {
      setMessages(prev => upsertMessage(prev, message));
    };

    socket.on('chat:direct:new', handleIncomingMessage);

    if (authToken) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => {
      socket.off('chat:direct:new', handleIncomingMessage);
    };
  }, []);

  useEffect(() => {
    const socket = chatSocketRef.current;
    if (!socket) return;

    setChatSocketAuthToken(authToken);

    if (authToken) {
      socket.connect();
    } else {
      socket.disconnect();
    }
  }, [authToken]);

  useEffect(() => {
    let syncTicker: ReturnType<typeof setInterval> | undefined;

    fetchState();

    if (authToken) {
      syncTicker = setInterval(() => {
        fetchState(true);
      }, 3000);
    }

    return () => {
      if (syncTicker) {
        clearInterval(syncTicker);
      }
    };
  }, [authToken]);

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
      const res = await apiFetch('/api/erp/punch', {
        method: 'POST',
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
    const tlData = selectedTL ? { name: selectedTL.name, email: selectedTL.email } : undefined;
    
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/worklog', {
        method: 'POST',
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
  const handleSendEmail = async (worklogId: string, customSubject: string, customBody: string, recipientId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/send-email', {
        method: 'POST',
        body: JSON.stringify({ worklogId, customSubject, customBody, recipientId })
      });
      if (res.ok) {
        const data = await res.json();
        setWorklogs(data.state.worklogs);
        setSentEmailsLog(data.state.sentEmailsLog);
        triggerAlert('success', 'Mail sent successfully. Logging dispatch item.');
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
    projectName?: string;
    estimatedHours?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/task', {
        method: 'POST',
        body: JSON.stringify({
          ...taskData,
          assignedBy: currentMemberId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', `Published brand new work assignment successfully.`);
      } else {
        triggerAlert('error', 'Task upload rejected by server ERP engine.');
      }
    } catch (err) {
      triggerAlert('error', 'Network error distributing task logs.');
    } finally {
      setLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async (name: string, description: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/manager/project', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description,
          createdBy: currentMemberId
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.state.projects);
        triggerAlert('success', `Enterprise Project "${name}" initialized successfully!`);
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to create active project.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure connecting database gateway.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/manager/project/delete', {
        method: 'POST',
        body: JSON.stringify({ projectId, deletedBy: currentMemberId })
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.state.projects);
        triggerAlert('success', 'Project deleted successfully.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to delete project.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure deleting project.');
    } finally {
      setLoading(false);
    }
  };

  // Update distributed task status
  const handleUpdateTaskStatus = async (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/task/update', {
        method: 'POST',
        body: JSON.stringify({ taskId, status, actorId: currentMemberId })
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

  // Add comment to task
  const handleAddTaskComment = async (taskId: string, text: string) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/task/comment', {
        method: 'POST',
        body: JSON.stringify({ taskId, authorId: currentMemberId, text })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Comment added.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to add comment.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure adding comment.');
    } finally {
      setLoading(false);
    }
  };

  // Update task subtasks
  const handleUpdateTaskSubtasks = async (taskId: string, subtasks: any[]) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/task/subtasks', {
        method: 'POST',
        body: JSON.stringify({ taskId, subtasks, actorId: currentMemberId })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Subtasks progress synchronized.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to sync subtasks.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure syncing subtasks.');
    } finally {
      setLoading(false);
    }
  };

  // Full Task details update
  const handleUpdateTaskDetails = async (taskId: string, updates: any) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/task/update', {
        method: 'POST',
        body: JSON.stringify({ taskId, actorId: currentMemberId, ...updates })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Task specifications updated successfully.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to update task.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure updating task files.');
    } finally {
      setLoading(false);
    }
  };

  // Handle register user
  const handleRegisterUser = async (userData: {
    name: string;
    email: string;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number;
    breakDay: string;
    role: string;
    password?: string;
  }) => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/register', {
        method: 'POST',
        body: JSON.stringify({
          ...userData,
          roleType: 'Engineer',
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setCurrentMemberId(data.member.id); // auto select newly registered member!
        setAuthToken(data.token);
        setAuthRoleType(data.member.roleType || 'Engineer');
        localStorage.setItem('syncspace_current_member_id', data.member.id);
        localStorage.setItem('syncspace_auth_token', data.token);
        localStorage.setItem('syncspace_auth_role_type', data.member.roleType || 'Engineer');
        triggerAlert('success', `Successfully registered employee ${data.member.name} (Engineer privileges). Session started!`);
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Server rejected registration.');
      }
    } catch (err) {
      triggerAlert('error', 'Network failure registering new engineer.');
    } finally {
      setLoading(false);
    }
  };

  // Handle DB role updates ("from db we will change the role as manager")
  const handleUpdateUserRole = async (userId: string, roleType: 'Engineer' | 'Manager') => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/erp/update-role', {
        method: 'POST',
        body: JSON.stringify({ userId, roleType })
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        triggerAlert('success', `Direct Database Event: Updated role type of ${data.member.name} to [${roleType}].`);
      } else {
        triggerAlert('error', 'Failed to change database role setting.');
      }
    } catch (err) {
      triggerAlert('error', 'Network error modifying database role keys.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      triggerAlert('error', 'Please enter your account email.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        triggerAlert('info', data.message || 'If the account exists, a recovery token has been generated.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Unable to start password recovery.');
      }
    } catch {
      triggerAlert('error', 'Network failure while requesting password recovery.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim() || !resetToken.trim() || !resetNewPassword.trim()) {
      triggerAlert('error', 'Please fill email, reset token, and new password.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail.trim(),
          token: resetToken.trim(),
          newPassword: resetNewPassword
        })
      });

      if (res.ok) {
        triggerAlert('success', 'Password has been reset. Please login with your new password.');
        setResetToken('');
        setResetNewPassword('');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Unable to reset password.');
      }
    } catch {
      triggerAlert('error', 'Network failure while resetting password.');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerGeneratePasswordReset = async (memberId: string) => {
    const res = await apiFetch('/api/manager/password-reset/generate', {
      method: 'POST',
      body: JSON.stringify({ memberId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate password reset token.');
    }

    return res.json();
  };

  // Handle direct messaging between manager and engineers
  const handleSendMessage = async (receiverId: string, text: string) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const socket = chatSocketRef.current;
    if (socket?.connected) {
      socket.emit(
        'chat:direct:send',
        {
          senderId: currentMemberId,
          receiverId,
          text: normalizedText
        },
        (ack: { ok: boolean; message?: DirectMessage; error?: string }) => {
          if (!ack?.ok) {
            triggerAlert('error', ack?.error || 'Failed to send message.');
          } else if (ack.message) {
            setMessages(prev => upsertMessage(prev, ack.message));
          }
        }
      );
      return;
    }

    try {
      const res = await apiFetch('/api/erp/message', {
        method: 'POST',
        body: JSON.stringify({
          senderId: currentMemberId,
          receiverId,
          text: normalizedText
        })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((data.state.messages || []) as DirectMessage[]);
        triggerAlert('success', 'Message dispatched successfully!');
      } else {
        triggerAlert('error', 'Server failed to save direct message.');
      }
    } catch (err) {
      triggerAlert('error', 'Connection error routing chat stream.');
    }
  };

  const currentMember = members.find(m => m.id === currentMemberId);
  const teamLeads = members.filter(m => m.isTL);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const punchesForToday = currentMember ? punches.filter(p => p.userId === currentMemberId && p.date === todayStr) : [];
  const activeWorklog = currentMember ? (worklogs.find(w => w.userId === currentMemberId && w.date === todayStr) || null) : null;

  // Global aggregate metrics
  const activeShiftAttendees = members.filter(m => m.punchStatus === 'Active').length;
  const breakShiftAttendees = members.filter(m => m.punchStatus === 'Break').length;
  const submittedLogsTodayCount = worklogs.filter(w => w.date === todayStr).length;

  if (!currentMember) {
    return (
      <div className="min-h-screen bg-[#fbfaf5] text-[#3d403a] flex flex-col antialiased font-sans" id="remote-erp-root-panel">
        {/* Status Toast banner */}
        {systemAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-xs font-semibold animate-pulse max-w-sm bg-indigo-50 border-indigo-200 text-indigo-800 animate-bounce" id="erp-system-banner-notifications">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            {systemAlert.text}
          </div>
        )}

        {/* Global Landing Banner */}
        <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-3.5 px-6 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2.5">
              <img 
                src={aiLogo} 
                alt="AI Solution USA Logo" 
                className="w-10 h-10 rounded-xl object-contain border border-[#e2dfd2] bg-white pointer-events-none p-0.5"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">AI Solution USA</h1>
                <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Enterprise Portal</span>
              </div>
            </div>
          </div>
        </header>

        {/* Immersive Welcome split layout */}
        <main className="max-w-7xl w-full mx-auto p-6 flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-8 items-center my-auto">
          {/* Left Column: Swiss Showcase Branding */}
          <section className="lg:col-span-12 xl:col-span-5 w-full flex flex-col justify-center space-y-6 text-left p-6 bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-3xl">
            <div className="space-y-3">
              <span className="text-[10px] font-bold tracking-widest font-mono text-[#5a6e53] uppercase bg-[#5a6e53]/10 px-2.5 py-1 rounded-full w-max block">
                Enterprise Terminal Gateway
              </span>
              <h2 className="text-3xl font-bold font-serif text-[#2d3a2a] leading-tight">
                Empowering Decentralized Enterprise Authority
              </h2>
              <p className="text-xs text-[#7a7d75] leading-relaxed">
                AI Solution USA converges smart operational reporting, automated hourly workflows, and intelligent Team-Leader task allocation systems into a secure, cohesive corporate workspace.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-[#5a6e53]/10 rounded-lg text-[#5a6e53] shrink-0 mt-0.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3d403a]">Interactive Shift Punch Controls</h4>
                  <p className="text-[11px] text-[#7a7d75]">Log clock-ins, instant breaks, and structured shift details precisely.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-[#5a6e53]/10 rounded-lg text-[#5a6e53] shrink-0 mt-0.5">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3d403a]">Gemini-AI Professional Summarizer</h4>
                  <p className="text-[11px] text-[#7a7d75]">Transcribe daily logs into pristine email summaries for Team Leads immediately.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="p-1.5 bg-[#5a6e53]/10 rounded-lg text-[#5a6e53] shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3d403a]">Peer-To-Peer Direct Messages</h4>
                  <p className="text-[11px] text-[#7a7d75]">Managers can correspond with any engineer, and engineers can message each other directly.</p>
                </div>
              </div>
            </div>

            <div className="bg-[#f4f1e8] p-4 rounded-2xl border border-[#e2dfd2] text-[11px] text-[#5a6e53] space-y-1 font-mono italic">
              <p className="font-bold uppercase not-italic text-[10px] tracking-wider text-[#3d403a] mb-1">
                🔒 Environment Protocol:
              </p>
              <p>• Secure session token verification active.</p>
              <p>• Data storage is persisted in relational database structures.</p>
            </div>
          </section>

          {/* Right Column: Portal Auth Terminal */}
          <section className="lg:col-span-7 w-full flex flex-col justify-start">
            <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
              <div>
                {/* Tabs selection */}
                <div className="flex border-b border-[#e2dfd2] mb-6">
                  <button
                    onClick={() => setAuthTab('login')}
                    className={`flex-1 pb-3 text-sm font-serif font-semibold transition-all border-b-2 cursor-pointer ${
                      authTab === 'login'
                        ? 'border-[#5a6e53] text-[#2d3a2a]'
                        : 'border-transparent text-slate-400 hover:text-[#3d403a]'
                    }`}
                  >
                    Enterprise Login
                  </button>
                  <button
                    onClick={() => setAuthTab('register')}
                    className={`flex-1 pb-3 text-sm font-serif font-semibold transition-all border-b-2 cursor-pointer ${
                      authTab === 'register'
                        ? 'border-[#5a6e53] text-[#2d3a2a]'
                        : 'border-transparent text-slate-400 hover:text-[#3d403a]'
                    }`}
                  >
                    Register New Employee
                  </button>
                </div>

                {authTab === 'login' ? (
                  /* Login layout */
                  <div className="space-y-6">
                    <div className="text-left space-y-1">
                      <h3 className="text-base font-bold font-serif text-[#2d3a2a]">Account Verification</h3>
                      <p className="text-xs text-[#7a7d75]">Sign in with your enterprise email and secure password.</p>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!loginEmail.trim() || !loginPassword) {
                          triggerAlert('error', 'Please fill in both email and password.');
                          return;
                        }
                        try {
                          setLoading(true);
                          const res = await apiFetch('/api/erp/login', {
                            method: 'POST',
                            body: JSON.stringify({ email: loginEmail, password: loginPassword })
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setCurrentMemberId(data.member.id);
                            setAuthToken(data.token);
                            setAuthRoleType(data.member.roleType || 'Engineer');
                            localStorage.setItem('syncspace_current_member_id', data.member.id);
                            localStorage.setItem('syncspace_auth_token', data.token);
                            localStorage.setItem('syncspace_auth_role_type', data.member.roleType || 'Engineer');
                            triggerAlert('success', `Welcome back, ${data.member.name}! Hashed credential session starts.`);
                          } else {
                            const err = await res.json();
                            triggerAlert('error', err.error || 'Invalid corporate credentials.');
                          }
                        } catch (err) {
                          triggerAlert('error', 'Network failure connecting authentication gateway.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="space-y-3 text-left"
                    >
                      <div>
                        <label className="text-xs font-bold text-[#3d403a] block mb-1">Corporate Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="e.g. manager@company.com"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-[#3d403a] block mb-1">Secure Hashed Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#5a6e53] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-serif uppercase tracking-wider"
                      >
                        Verify & Login
                      </button>

                      <div className="pt-3 border-t border-[#e2dfd2] space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="email"
                            placeholder="Forgot password email"
                            value={forgotEmail}
                            onChange={e => setForgotEmail(e.target.value)}
                            className="sm:col-span-2 text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                          />
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs font-bold px-3 py-2 rounded-xl border border-[#d4a373] text-[#d4a373] hover:bg-[#f4f1e8] cursor-pointer"
                          >
                            Forgot Password
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="email"
                            placeholder="Reset email"
                            value={resetEmail}
                            onChange={e => setResetEmail(e.target.value)}
                            className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                          />
                          <input
                            type="text"
                            placeholder="Recovery token"
                            value={resetToken}
                            onChange={e => setResetToken(e.target.value)}
                            className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                          />
                          <input
                            type="password"
                            placeholder="New password"
                            value={resetNewPassword}
                            onChange={e => setResetNewPassword(e.target.value)}
                            className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleResetPassword}
                          className="w-full py-2 text-xs font-bold rounded-xl border border-[#5a6e53] text-[#5a6e53] hover:bg-[#f4f1e8] cursor-pointer"
                        >
                          Reset Password With Token
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                                    <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!regName || !regEmail || !regPassword) {
                        triggerAlert('error', 'Please fill in name, email, and password.');
                        return;
                      }
                      handleRegisterUser({
                        name: regName,
                        email: regEmail,
                        department: regDept,
                        agreementHours: regHours,
                        breakDay: regBreak,
                        role: regRole,
                        password: regPassword
                      });
                      setRegName('');
                      setRegEmail('');
                      setRegPassword('');
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <h3 className="text-base font-bold font-serif text-[#2d3a2a]">Roster Self-Enrollment</h3>
                      <p className="text-xs text-[#7a7d75]">Apply directly to join the distributed workroom index. Standard applicants starts with remote Engineer privileges.</p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ada Lovelace"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Corporate Email</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. ada@lovelace.io"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Create Secure Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Corporate Title / Role</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Principal Lead Engineer"
                        value={regRole}
                        onChange={e => setRegRole(e.target.value)}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Department</label>
                      <select
                        value={regDept}
                        onChange={e => setRegDept(e.target.value as any)}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]"
                      >
                        <option value="Engineering">Engineering Department</option>
                        <option value="Product">Product Department</option>
                        <option value="Design">Design Department</option>
                        <option value="Marketing">Marketing Department</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1">Hours Commitment</label>
                      <select
                        value={regHours}
                        onChange={e => setRegHours(Number(e.target.value))}
                        className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]"
                      >
                        <option value={10}>10 Hours / Week (Freelance)</option>
                        <option value={20}>20 Hours / Week (Moderate)</option>
                        <option value={30}>30 Hours / Week (Intermediate)</option>
                        <option value={40}>40 Hours / Week (Dedicated Time)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs font-semibold text-[#3d403a] block mb-1.5">Preferred Week Off Days (Select Multiple)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const isSelected = regBreak.split(',').map(d => d.trim().toLowerCase()).includes(day.toLowerCase());
                          return (
                            <button
                              type="button"
                              key={day}
                              onClick={() => {
                                const selectedDays = regBreak ? regBreak.split(',').map(d => d.trim()).filter(Boolean) : [];
                                let newList;
                                if (selectedDays.includes(day)) {
                                  newList = selectedDays.filter(d => d !== day);
                                } else {
                                  newList = [...selectedDays, day];
                                }
                                if (newList.length === 0) {
                                  setRegBreak('Friday');
                                } else {
                                  const sorted = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter(d => newList.includes(d));
                                  setRegBreak(sorted.join(', '));
                                }
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#5a6e53] text-white border-[#5a6e53]'
                                  : 'bg-white text-[#3d403a] border-[#e2dfd2] hover:bg-[#f4f1e8]/40'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-[#7a7d75] mt-1.5 block">Selected Off Days: <strong className="text-[#3d403a] font-mono">{regBreak}</strong></span>
                    </div>

                    <div className="sm:col-span-2 pt-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#d4a373] text-white text-xs font-bold rounded-xl transition-all hover:bg-[#d4a373]/95 cursor-pointer font-serif uppercase tracking-wider shadow-xs"
                      >
                        Enroll as Remote Engineer & Login
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-transparent border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
          <span>&copy; 2026 AI Solution USA. All rights reserved.</span>
          <div className="flex justify-center gap-1.5 items-center font-semibold text-[#5a6e53]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px]">Database Connection Secure</span>
          </div>
        </footer>
      </div>
    );
  }

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
      <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-3.5 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <img 
              src={aiLogo} 
              alt="AI Solution USA Logo" 
              className="w-10 h-10 rounded-xl object-contain border border-[#e2dfd2] bg-white pointer-events-none p-0.5"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">AI Solution USA</h1>
              <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Enterprise Portal</span>
            </div>
          </div>

          {/* Controller selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Acting Context Profile Selector */}
            <div className="flex items-center gap-2 bg-white border border-[#e2dfd2] rounded-xl px-3 py-1.5">
              <span className="text-[10px] uppercase font-bold text-[#5a6e53] font-mono">Acting As:</span>
              {members.length > 0 && currentMember ? (
                currentMember.roleType === 'Manager' ? (
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
                  <span className="text-xs font-bold text-[#3d403a] select-none font-sans bg-transparent">
                    {currentMember.name} ({currentMember.role})
                  </span>
                )
              ) : (
                <span className="text-xs text-slate-400 font-bold">Loading roster...</span>
              )}
            </div>

            {/* Sync DB, and registration controller */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentMember && currentMember.roleType === 'Manager' && (
                <button
                  onClick={() => setShowRegForm(!showRegForm)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    showRegForm ? 'bg-[#5a6e53] text-white border-[#5a6e53]' : 'bg-[#d4a373] hover:opacity-90 text-white border-[#d4a373]'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showRegForm ? 'Close Registration' : 'Register Employee'}</span>
                </button>
              )}
              <button
                onClick={() => fetchState(false)}
                disabled={loading}
                className="p-2 border border-[#e2dfd2] bg-white hover:bg-[#f4f1e8] text-[#5a6e53] rounded-xl transition-colors cursor-pointer"
                title="Synchronize data layers with database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-400' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setCurrentMemberId('');
                  setAuthToken('');
                  setAuthRoleType('');
                  localStorage.removeItem('syncspace_current_member_id');
                  localStorage.removeItem('syncspace_auth_token');
                  localStorage.removeItem('syncspace_auth_role_type');
                  triggerAlert('info', 'Logged out successfully from remote ERP session.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Log out of Secure Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 3. Global Activity or Personalized Metrics Band */}
      <section className="bg-white border-b border-[#e2dfd2] px-6 py-4">
        {currentMember && currentMember.roleType === 'Manager' ? (
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
        ) : (
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">My Attendance State</span>
                <span className="text-base font-bold text-emerald-700 block mt-0.5">{currentMember?.punchStatus || 'Offline'}</span>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full ${currentMember?.punchStatus === 'Active' ? 'bg-emerald-500 animate-pulse' : currentMember?.punchStatus === 'Break' ? 'bg-amber-400' : 'bg-slate-400'}`} />
            </div>
            <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">My Pending Tasks</span>
                <span className="text-base font-bold text-amber-700 block mt-0.5">
                  {tasks.filter(t => t.assignedTo === currentMemberId && t.status !== 'Completed').length} Pending
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-[#5a6e53]" />
            </div>
            <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">My Arrangement Commitment</span>
                <span className="text-base font-bold text-[#3d403a] block mt-0.5">{currentMember?.agreementHours || 20} hrs/week</span>
              </div>
              <Inbox className="w-4 h-4 text-[#5a6e53]" />
            </div>
            <div className="bg-[#f4f1e8]/30 p-3 rounded-xl border border-[#e2dfd2]/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#7a7d75] font-bold uppercase tracking-wider block">My Work Log Today</span>
                <span className="text-base font-bold text-[#3d403a] block mt-0.5">{activeWorklog ? 'Completed' : 'Pending'}</span>
              </div>
              <Briefcase className="w-4 h-4 text-[#5a6e53]" />
            </div>
          </div>
        )}
      </section>

      {/* 4. Primary Content Board */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 space-y-6">

        {/* Collapsible Remote Registration Form Card */}
        {showRegForm && (
          <div className="max-w-7xl w-full mx-auto p-6 bg-white border-2 border-[#d4a373]/40 rounded-3xl shadow-md space-y-4 animate-fade-in text-left" id="employee-registration-terminal">
            <div className="flex items-center gap-2.5 pb-2 border-b border-[#e2dfd2]">
              <div className="p-2 bg-[#d4a373]/10 text-[#d4a373] rounded-xl">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2d3a2a] uppercase tracking-wider font-serif">Remote Member Registration System</h3>
                <p className="text-xs text-[#7a7d75]">Enroll new team members immediately into the SQLite index. Candidates start with Engineer privileges.</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!regName || !regEmail) return;
                handleRegisterUser({
                  name: regName,
                  email: regEmail,
                  department: regDept,
                  agreementHours: regHours,
                  breakDay: regBreak,
                  role: regRole
                });
                setRegName('');
                setRegEmail('');
                setShowRegForm(false);
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div>
                <label className="text-xs font-semibold text-[#3d403a] block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Ada Lovelace"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3d403a] block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ada@lovelace.io"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3d403a] block mb-1">Job Designation Role</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core System Engineer"
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3d403a] block mb-1">Sponsoring Department</label>
                <select
                  value={regDept}
                  onChange={e => setRegDept(e.target.value as any)}
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]"
                >
                  <option value="Engineering">Engineering Department</option>
                  <option value="Product">Product Department</option>
                  <option value="Design">Design Department</option>
                  <option value="Marketing">Marketing Department</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#3d403a] block mb-1">Weekly Commitment (Hours Agreement)</label>
                <select
                  value={regHours}
                  onChange={e => setRegHours(Number(e.target.value))}
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]"
                >
                  <option value={10}>10 Hours per week (Short Term Contract)</option>
                  <option value={20}>20 Hours per week (Moderate Freelance)</option>
                  <option value={30}>30 Hours per week (Intermediate Support)</option>
                  <option value={40}>40 Hours per week (Dedicated Full Time)</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-semibold text-[#3d403a] block mb-1.5">Custom Preferred Break Off Days (Select Multiple)</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                    const isSelected = regBreak.split(',').map(d => d.trim().toLowerCase()).includes(day.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => {
                          const selectedDays = regBreak ? regBreak.split(',').map(d => d.trim()).filter(Boolean) : [];
                          let newList;
                          if (selectedDays.includes(day)) {
                            newList = selectedDays.filter(d => d !== day);
                          } else {
                            newList = [...selectedDays, day];
                          }
                          if (newList.length === 0) {
                            setRegBreak('Friday');
                          } else {
                            const sorted = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter(d => newList.includes(d));
                            setRegBreak(sorted.join(', '));
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#5a6e53] text-white border-[#5a6e53]'
                            : 'bg-white text-[#3d403a] border-[#e2dfd2] hover:bg-[#f4f1e8]/40'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-[#7a7d75] mt-1.5 block">Selected Off Days: <strong className="text-[#3d403a] font-mono">{regBreak}</strong></span>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#d4a373] text-white text-xs font-bold rounded-xl transition-all hover:bg-[#d4a373]/95 cursor-pointer shadow-xs"
                >
                  {loading ? 'Adding member records...' : 'Confirm Registration (Default privileges: Engineer)'}
                </button>
              </div>
            </form>
          </div>
        )}
        
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
                      tasks={tasks}
                    />
                  )}
                </div>
              </div>

              {/* Right Column (Span 1): Gemini Professional Email draft Review and Send */}
              <div className="lg:col-span-1">
                <EmailDraftCard
                  worklog={activeWorklog}
                  currentMember={currentMember}
                  members={members}
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
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => setActiveTab('roster')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'roster' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                    }`}
                  >
                    Roster & Backlog
                  </button>
                  {currentMember && (
                    <button
                      onClick={() => setActiveTab('allocator')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'allocator' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                      }`}
                    >
                      {currentMember.roleType === 'Manager' ? 'Distribute Task List (Manager Mode)' : 'Self-Assign Tasks'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'messages' ? 'bg-[#5a6e53] text-white shadow-xs' : 'hover:bg-[#f4f1e8] text-[#3d403a]'
                    }`}
                  >
                    Direct Messages (Chat)
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

              {activeTab === 'roster' && currentMember && (
                <TeamDashboard
                  currentMember={currentMember}
                  members={members}
                  punches={punches}
                  tasks={tasks}
                  worklogs={worklogs}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onAddComment={handleAddTaskComment}
                  onUpdateSubtasks={handleUpdateTaskSubtasks}
                  onUpdateTaskDetails={handleUpdateTaskDetails}
                  loading={loading}
                  onUpdateUserRole={handleUpdateUserRole}
                  onGeneratePasswordResetToken={handleManagerGeneratePasswordReset}
                />
              )}

              {activeTab === 'allocator' && currentMember && (
                <TaskAllocator
                  currentMember={currentMember}
                  members={members}
                  projects={projects}
                  onAssignTask={handleAssignTask}
                  onCreateProject={handleCreateProject}
                  onDeleteProject={handleDeleteProject}
                  loading={loading}
                />
              )}

              {activeTab === 'messages' && currentMember && (
                <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm animate-fade-in" id="direct-messaging-workspace">
                  <div className="pb-3 border-[#e2dfd2] border-b mb-4 flex justify-between items-center flex-wrap gap-2 text-left">
                    <div>
                      <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">Secure Enterprise Direct Messaging</h3>
                      <p className="text-xs text-[#7a7d75]">Encrypted remote correspondence workspace</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#5a6e53] font-mono bg-[#f4f1e8] border border-[#e2dfd2] px-2.5 py-0.5 rounded-full">
                      Logged in: {currentMember.name} ({currentMember.roleType})
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left profile selection list */}
                    <div className="md:col-span-1 border-r border-[#e2dfd2]/60 pr-4 space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono text-left">Active Remote Members</span>
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {members
                          .filter(m => m.id !== currentMember.id)
                          .map(m => {
                            return (
                              <button
                                key={m.id}
                                onClick={() => setSelectedChatUserId(m.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                                  selectedChatUserId === m.id
                                    ? 'bg-[#5a6e53]/10 text-[#2d3a2a] border border-[#5a6e53]/35 font-bold'
                                    : 'hover:bg-[#f4f1e8]/30 text-[#3d403a]'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  <div>
                                    <p className="font-bold leading-tight">{m.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono italic leading-none">{m.roleType}</p>
                                  </div>
                                </div>
                                <span className={`text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded leading-none shrink-0 ${
                                  m.punchStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {m.punchStatus}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                    
                    {/* Right chat list */}
                    <div className="md:col-span-2 flex flex-col justify-between min-h-[320px]">
                      {selectedChatUserId ? (
                        <>
                          {/* Messages thread bubble list */}
                          <div className="space-y-3 overflow-y-auto max-h-[245px] pr-1 flex-1 mb-4 text-left">
                            {(() => {
                              const correspondent = members.find(m => m.id === selectedChatUserId);
                              const threadMessages = messages.filter(
                                msg => (msg.senderId === currentMember.id && msg.receiverId === selectedChatUserId) ||
                                       (msg.senderId === selectedChatUserId && msg.receiverId === currentMember.id)
                              );
                              
                              if (threadMessages.length === 0) {
                                return (
                                  <div className="text-center py-12 text-[#7a7d75] italic text-[11px]">
                                    No past communications with {correspondent?.name || 'this correspondent'}. Write a diagnostic message below!
                                  </div>
                                );
                              }
                              
                              return threadMessages.map(msg => {
                                const isMe = msg.senderId === currentMember.id;
                                return (
                                  <div key={msg.id} className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                                    isMe 
                                      ? 'bg-[#5a6e53] text-white ml-auto rounded-tr-none' 
                                      : 'bg-[#f4f1e8] text-[#3d403a] mr-auto rounded-tl-none'
                                  }`}>
                                    <p className="font-bold text-[9px] opacity-75 font-mono uppercase mb-0.5">
                                      {isMe ? 'You' : msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p>{msg.text}</p>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                          
                          {/* Send action bar */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={typedMessage}
                              onChange={e => setTypedMessage(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (typedMessage.trim() && selectedChatUserId) {
                                    handleSendMessage(selectedChatUserId, typedMessage);
                                    setTypedMessage('');
                                  }
                                }
                              }}
                              placeholder="Write secure workspace correspondence..."
                              className="flex-1 text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                            />
                            <button
                              onClick={() => {
                                if (typedMessage.trim() && selectedChatUserId) {
                                  handleSendMessage(selectedChatUserId, typedMessage);
                                  setTypedMessage('');
                                }
                              }}
                              className="bg-[#5a6e53] hover:opacity-90 text-white p-2.5 rounded-xl cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <MessageSquare className="w-8 h-8 text-[#5a6e53] opacity-40 mb-2" />
                          <p className="text-xs font-semibold text-[#7a7d75]">Select a correspondent profile on the left column to engage live direct messaging</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sentLogs' && (
                <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2] mb-4">
                    <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">TL Dispatch & Send Log Index</h3>
                    <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] px-2.5 py-0.5 rounded-lg border border-[#e2dfd2]/60">
                      Total sent: {currentMember && currentMember.roleType === 'Manager' 
                        ? sentEmailsLog.length 
                        : sentEmailsLog.filter((log: any) => log.senderId === currentMemberId).length}
                    </span>
                  </div>

                  {(() => {
                    const filteredEmails = currentMember && currentMember.roleType === 'Manager'
                      ? sentEmailsLog
                      : sentEmailsLog.filter((log: any) => log.senderId === currentMemberId);

                    if (filteredEmails.length === 0) {
                      return (
                        <div className="text-center py-20 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/20">
                          <p className="text-[#7a7d75] text-xs font-semibold">No recorded dispatch emails for this profile yet.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {filteredEmails.map((log: any) => {
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
                    );
                  })()}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* 5. Clean footer */}
      <footer className="bg-transparent border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
        <span>&copy; 2026 AI Solution USA. All rights reserved.</span>
        <div className="flex justify-center gap-1.5 items-center font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5a6e53]" />
          <span className="text-[11px]">Database Connection Secure</span>
        </div>
      </footer>
    </div>
  );
}
