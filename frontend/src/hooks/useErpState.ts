import { useState, useEffect, useCallback, SetStateAction } from 'react';
import { createApiFetch } from '../api/apiFetch';
import { TeamMember, PunchRecord, WorkLog, TaskDistribution, LogItem, DirectMessage, EnterpriseProject, AttendanceData, DayAttendanceRow } from '../types';
import { upsertMessage } from './useChatSocket';

export type ActiveTab = 'roster' | 'allocator' | 'messages' | 'sentLogs' | 'profile';
export type Screen = 'auth' | 'home' | 'dashboard';

export interface ErpState {
  // Data
  members: TeamMember[];
  punches: PunchRecord[];
  worklogs: WorkLog[];
  tasks: TaskDistribution[];
  sentEmailsLog: any[];
  messages: DirectMessage[];
  projects: EnterpriseProject[];
  attendance: AttendanceData | null;

  // Auth
  authToken: string;
  authRoleType: string;
  authMemberId: string;
  currentMemberId: string;

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
  currentScreen: Screen;
  managerViewMode: 'manager' | 'engineer';
  activeTab: ActiveTab;
  systemAlert: { type: 'success' | 'error' | 'info'; text: string } | null;

  // Derived
  currentMember: TeamMember | undefined;
  effectiveMember: TeamMember | null;
  effectiveRoleType: TeamMember['roleType'];
  teamLeads: TeamMember[];
  todayStr: string;
  punchesForToday: PunchRecord[];
  activeWorklog: WorkLog | null;
  activeShiftAttendees: number;
  breakShiftAttendees: number;
  submittedLogsTodayCount: number;

  // Setters
  setMessages: React.Dispatch<React.SetStateAction<DirectMessage[]>>;
  setCurrentMemberId: (id: string) => void;
  setCurrentScreen: (screen: Screen) => void;
  setManagerViewMode: (mode: 'manager' | 'engineer') => void;
  setActiveTab: (tab: ActiveTab) => void;

  // Actions
  triggerAlert: (type: 'success' | 'error' | 'info', text: string) => void;
  handleProfileSwitch: (id: string) => void;
  handlePunch: (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => Promise<void>;
  handleAppendWorklogItem: (item: LogItem, tlId: string) => Promise<void>;
  handleDeleteWorklogItem: (worklogId: string, itemId: string) => Promise<void>;
  handleSendEmail: (worklogId: string | undefined, subject: string, body: string, recipientId: string) => Promise<void>;
  handleAssignTask: (taskData: {
    title: string; description: string; assignedTo: string;
    priority: 'Low' | 'Medium' | 'High'; dueDate: string;
    projectName?: string; estimatedHours?: number; startDate?: string; endDate?: string;
  }) => Promise<void>;
  handleCreateProject: (name: string, description: string) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleUpdateTaskStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  handleAddTaskComment: (taskId: string, text: string) => Promise<void>;
  handleUpdateTaskSubtasks: (taskId: string, subtasks: any[]) => Promise<void>;
  handleUpdateTaskDetails: (taskId: string, updates: any) => Promise<void>;
  handleRegisterUser: (userData: {
    name: string; email: string;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number; breakDay: string; role: string; password?: string;
  }) => Promise<void>;
  handleUpdateUserRole: (userId: string, roleType: 'Engineer' | 'Manager') => Promise<void>;
  handleUpdateProfile: (profileData: {
    name: string; role: string; avatar: string;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number; breakDay: string;
  }) => Promise<void>;
  handleForgotPassword: (email: string) => Promise<void>;
  handleResetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
  handleManagerGeneratePasswordReset: (memberId: string) => Promise<any>;
  handleSendMessage: (receiverId: string, text: string, socketRef: React.MutableRefObject<any>) => Promise<void>;
  handleLogout: () => void;
  refetchAll: () => void;
  fetchMessages: () => Promise<void>;
  fetchAttendance: () => Promise<void>;
  fetchAttendanceForMonth: (memberId: string, year: number, month: number) => Promise<DayAttendanceRow[]>;
}

export function useErpState(): ErpState {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [punches, setPunches] = useState<PunchRecord[]>([]);
  const [worklogs, setWorklogs] = useState<WorkLog[]>([]);
  const [tasks, setTasks] = useState<TaskDistribution[]>([]);
  const [sentEmailsLog, setSentEmailsLog] = useState<any[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [projects, setProjects] = useState<EnterpriseProject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);

  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem('syncspace_auth_token') || ''
  );
  const [authRoleType, setAuthRoleType] = useState<string>(
    () => localStorage.getItem('syncspace_auth_role_type') || ''
  );
  const [authMemberId, setAuthMemberId] = useState<string>(
    () => localStorage.getItem('syncspace_auth_member_id') || ''
  );
  const [currentMemberId, setCurrentMemberIdState] = useState<string>(() =>
    localStorage.getItem('syncspace_auth_token')
      ? (localStorage.getItem('syncspace_current_member_id') || '')
      : ''
  );

  const [dataLoading, setDataLoading] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [managerViewMode, setManagerViewModeState] = useState<'manager' | 'engineer'>(
    () => (localStorage.getItem('syncspace_manager_view') as 'manager' | 'engineer') || 'manager'
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('roster');
  const [systemAlert, setSystemAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const setCurrentMemberId = useCallback((id: string) => {
    setCurrentMemberIdState(id);
  }, []);

  const setManagerViewMode = useCallback((mode: 'manager' | 'engineer') => {
    setManagerViewModeState(mode);
    localStorage.setItem('syncspace_manager_view', mode);
  }, []);

  // Build the fetch helper fresh each time authToken/authRoleType changes
  const apiFetch = useCallback(
    createApiFetch(authToken, authRoleType),
    [authToken, authRoleType]
  );

  const triggerAlert = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    setSystemAlert({ type, text });
    setTimeout(() => setSystemAlert(null), 5000);
  }, []);

  // ---- Fetchers ----
  const fetchState = useCallback(async () => {
    if (!authToken) { setDataLoading(false); return; }
    setDataLoading(true);
    try {
      const res = await apiFetch('/api/erp/state');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setPunches(data.punches || []);
        setTasks(data.tasks || []);
        setSentEmailsLog(data.sentEmailsLog || []);
      }
    } catch (err) {
      console.error('Failed to query standard state:', err);
    } finally {
      setDataLoading(false);
    }
  }, [authToken, apiFetch]);

  const fetchWorklogs = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/erp/worklogs');
      if (res.ok) {
        const data = await res.json();
        setWorklogs(data.worklogs || []);
      }
    } catch (err) {
      console.error('Failed to query worklog list:', err);
    }
  }, [authToken, apiFetch]);

  const fetchMessages = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/erp/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to query message list:', err);
    }
  }, [authToken, apiFetch]);

  const fetchProjects = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/erp/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to query project list:', err);
    }
  }, [authToken, apiFetch]);

  const fetchAttendance = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/erp/attendance');
      if (res.ok) {
        const data = await res.json();
        setAttendance(data);
      }
    } catch (err) {
      console.error('Failed to query attendance:', err);
    }
  }, [authToken, apiFetch]);

  const fetchAttendanceForMonth = useCallback(async (
    memberId: string,
    year: number,
    month: number // 0-indexed
  ): Promise<DayAttendanceRow[]> => {
    if (!authToken) return [];
    try {
      const params = new URLSearchParams({ memberId, year: String(year), month: String(month) });
      const res = await apiFetch(`/api/erp/attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        return data.monthRows ?? [];
      }
    } catch (err) {
      console.error('Failed to query attendance month:', err);
    }
    return [];
  }, [authToken, apiFetch]);

  const refetchAll = useCallback(() => {
    fetchState();
    fetchWorklogs();
    fetchMessages();
    fetchProjects();
    fetchAttendance();
  }, [fetchState, fetchWorklogs, fetchMessages, fetchProjects, fetchAttendance]);

  useEffect(() => { refetchAll(); }, [authToken]);

  // ---- Actions ----
  const handleProfileSwitch = useCallback((id: string) => {
    setCurrentMemberId(id);
    triggerAlert('info', 'Switched acting profile context on standard ERP dashboards.');
  }, [triggerAlert, setCurrentMemberId]);

  const handlePunch = useCallback(async (type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut', note?: string) => {
    try {
      setPunchLoading(true);
      const res = await apiFetch('/api/erp/punch', {
        method: 'POST',
        body: JSON.stringify({ userId: currentMemberId, type, note }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setPunches(data.state.punches);
        await fetchAttendance();
        triggerAlert('success', `Shift state converted successfully: ${type}`);
      } else {
        triggerAlert('error', 'Server rejected shift code submission.');
      }
    } catch {
      triggerAlert('error', 'Error pushing attendance logs to server.');
    } finally {
      setPunchLoading(false);
    }
  }, [apiFetch, currentMemberId, fetchAttendance, triggerAlert]);

  const handleAppendWorklogItem = useCallback(async (item: LogItem, tlId: string) => {
    const selectedTL = members.find(m => m.id === tlId);
    const tlData = selectedTL ? { name: selectedTL.name, email: selectedTL.email } : undefined;
    try {
      setLogLoading(true);
      const res = await apiFetch('/api/erp/worklog/append-item', {
        method: 'POST',
        body: JSON.stringify({ userId: currentMemberId, item, assignedTL: tlData }),
      });
      if (res.ok) {
        await fetchWorklogs();
        triggerAlert('success', 'Task appended and saved.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Server error saving task.');
      }
    } catch {
      triggerAlert('error', 'Network failure saving task.');
    } finally {
      setLogLoading(false);
    }
  }, [apiFetch, currentMemberId, fetchWorklogs, members, triggerAlert]);

  const handleDeleteWorklogItem = useCallback(async (worklogId: string, itemId: string) => {
    try {
      setLogLoading(true);
      const res = await apiFetch('/api/erp/worklog/delete-item', {
        method: 'POST',
        body: JSON.stringify({ worklogId, itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorklogs(data.worklogs || []);
        triggerAlert('success', 'Work log item deleted from database.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to delete work log item.');
      }
    } catch {
      triggerAlert('error', 'Network failure deleting work log item.');
    } finally {
      setLogLoading(false);
    }
  }, [apiFetch, triggerAlert]);

  const handleSendEmail = useCallback(async (worklogId: string | undefined, subject: string, body: string, recipientId: string) => {
    try {
      setEmailLoading(true);
      const res = await apiFetch('/api/erp/send-email', {
        method: 'POST',
        body: JSON.stringify({ worklogId, customSubject: subject, customBody: body, recipientId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSentEmailsLog(data.state.sentEmailsLog);
        if (worklogId) {
          await fetchWorklogs();
        }
        triggerAlert('success', 'Mail sent successfully. Logging dispatch item.');
      } else {
        triggerAlert('error', 'Simulation dispatch failure on server.');
      }
    } catch {
      triggerAlert('error', 'Network error dispatching email templates.');
    } finally {
      setEmailLoading(false);
    }
  }, [apiFetch, fetchWorklogs, triggerAlert]);

  const handleAssignTask = useCallback(async (taskData: {
    title: string; description: string; assignedTo: string;
    priority: 'Low' | 'Medium' | 'High'; dueDate: string;
    projectName?: string; estimatedHours?: number; startDate?: string; endDate?: string;
  }) => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/task', {
        method: 'POST',
        body: JSON.stringify({ ...taskData, assignedBy: currentMemberId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Published brand new work assignment successfully.');
      } else {
        triggerAlert('error', 'Task upload rejected by server ERP engine.');
      }
    } catch {
      triggerAlert('error', 'Network error distributing task logs.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, currentMemberId, triggerAlert]);

  const handleCreateProject = useCallback(async (name: string, description: string) => {
    try {
      setProjectLoading(true);
      const res = await apiFetch('/api/manager/project', {
        method: 'POST',
        body: JSON.stringify({ name, description, createdBy: currentMemberId }),
      });
      if (res.ok) {
        await fetchProjects();
        triggerAlert('success', `Enterprise Project "${name}" initialized successfully!`);
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to create active project.');
      }
    } catch {
      triggerAlert('error', 'Network failure connecting database gateway.');
    } finally {
      setProjectLoading(false);
    }
  }, [apiFetch, currentMemberId, fetchProjects, triggerAlert]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    try {
      setProjectLoading(true);
      const res = await apiFetch('/api/manager/project/delete', {
        method: 'POST',
        body: JSON.stringify({ projectId, deletedBy: currentMemberId }),
      });
      if (res.ok) {
        await fetchProjects();
        triggerAlert('success', 'Project deleted successfully.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to delete project.');
      }
    } catch {
      triggerAlert('error', 'Network failure deleting project.');
    } finally {
      setProjectLoading(false);
    }
  }, [apiFetch, currentMemberId, fetchProjects, triggerAlert]);

  const handleUpdateTaskStatus = useCallback(async (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/task/update', {
        method: 'POST',
        body: JSON.stringify({ taskId, status, actorId: currentMemberId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', `Updated task state to status: [${status}]`);
      } else {
        triggerAlert('error', 'Failed updating backlog items.');
      }
    } catch {
      triggerAlert('error', 'Task routing modification error on standard server.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, currentMemberId, triggerAlert]);

  const handleAddTaskComment = useCallback(async (taskId: string, text: string) => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/task/comment', {
        method: 'POST',
        body: JSON.stringify({ taskId, authorId: currentMemberId, text }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Comment added.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to add comment.');
      }
    } catch {
      triggerAlert('error', 'Network failure adding comment.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, currentMemberId, triggerAlert]);

  const handleUpdateTaskSubtasks = useCallback(async (taskId: string, subtasks: any[]) => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/task/subtasks', {
        method: 'POST',
        body: JSON.stringify({ taskId, subtasks, actorId: currentMemberId }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Subtasks progress synchronized.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to sync subtasks.');
      }
    } catch {
      triggerAlert('error', 'Network failure syncing subtasks.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, currentMemberId, triggerAlert]);

  const handleUpdateTaskDetails = useCallback(async (taskId: string, updates: any) => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/task/update', {
        method: 'POST',
        body: JSON.stringify({ taskId, actorId: currentMemberId, ...updates }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.state.tasks);
        triggerAlert('success', 'Task specifications updated successfully.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to update task.');
      }
    } catch {
      triggerAlert('error', 'Network failure updating task files.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, currentMemberId, triggerAlert]);

  const handleRegisterUser = useCallback(async (userData: {
    name: string; email: string;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number; breakDay: string; role: string; password?: string;
  }) => {
    try {
      setAuthLoading(true);
      const res = await apiFetch('/api/erp/register', {
        method: 'POST',
        body: JSON.stringify({ ...userData, roleType: 'Engineer' }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        setCurrentMemberId(data.member.id);
        setAuthToken(data.token);
        setAuthRoleType(data.member.roleType || 'Engineer');
        setAuthMemberId(data.member.id);
        localStorage.setItem('syncspace_current_member_id', data.member.id);
        localStorage.setItem('syncspace_auth_token', data.token);
        localStorage.setItem('syncspace_auth_role_type', data.member.roleType || 'Engineer');
        localStorage.setItem('syncspace_auth_member_id', data.member.id);
        setCurrentScreen('home');
        triggerAlert('success', `Successfully registered employee ${data.member.name} (Engineer privileges). Session started!`);
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Server rejected registration.');
      }
    } catch {
      triggerAlert('error', 'Network failure registering new engineer.');
    } finally {
      setAuthLoading(false);
    }
  }, [apiFetch, triggerAlert, setCurrentMemberId]);

  const handleUpdateUserRole = useCallback(async (userId: string, roleType: 'Engineer' | 'Manager') => {
    try {
      setTaskLoading(true);
      const res = await apiFetch('/api/erp/update-role', {
        method: 'POST',
        body: JSON.stringify({ userId, roleType }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members);
        triggerAlert('success', `Direct Database Event: Updated role type of ${data.member.name} to [${roleType}].`);
      } else {
        triggerAlert('error', 'Failed to change database role setting.');
      }
    } catch {
      triggerAlert('error', 'Network error modifying database role keys.');
    } finally {
      setTaskLoading(false);
    }
  }, [apiFetch, triggerAlert]);

  const handleUpdateProfile = useCallback(async (profileData: {
    name: string; role: string; avatar: string;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number; breakDay: string;
  }) => {
    try {
      setProfileLoading(true);
      const res = await apiFetch('/api/erp/profile', {
        method: 'POST',
        body: JSON.stringify({ userId: currentMemberId, ...profileData }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.state.members || []);
        setPunches(data.state.punches || []);
        setTasks(data.state.tasks || []);
        setSentEmailsLog(data.state.sentEmailsLog || []);
        await Promise.all([fetchWorklogs(), fetchMessages(), fetchProjects()]);
        triggerAlert('success', 'Profile updated successfully.');
      } else {
        const err = await res.json();
        const message = err.error || 'Failed to update profile.';
        triggerAlert('error', message);
        throw new Error(message);
      }
    } catch (error) {
      if (error instanceof TypeError) {
        triggerAlert('error', 'Network error while updating profile.');
      }
      throw error;
    } finally {
      setProfileLoading(false);
    }
  }, [apiFetch, currentMemberId, fetchWorklogs, fetchMessages, fetchProjects, triggerAlert]);

  const handleForgotPassword = useCallback(async (email: string) => {
    if (!email.trim()) { triggerAlert('error', 'Please enter your account email.'); return; }
    try {
      setAuthLoading(true);
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
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
      setAuthLoading(false);
    }
  }, [apiFetch, triggerAlert]);

  const handleResetPassword = useCallback(async (email: string, token: string, newPassword: string) => {
    if (!email.trim() || !token.trim() || !newPassword.trim()) {
      triggerAlert('error', 'Please fill email, reset token, and new password.');
      return;
    }
    try {
      setAuthLoading(true);
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), token: token.trim(), newPassword }),
      });
      if (res.ok) {
        triggerAlert('success', 'Password has been reset. Please login with your new password.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Unable to reset password.');
      }
    } catch {
      triggerAlert('error', 'Network failure while resetting password.');
    } finally {
      setAuthLoading(false);
    }
  }, [apiFetch, triggerAlert]);

  const handleManagerGeneratePasswordReset = useCallback(async (memberId: string) => {
    const res = await apiFetch('/api/manager/password-reset/generate', {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to generate password reset token.');
    }
    return res.json();
  }, [apiFetch]);

  const handleSendMessage = useCallback(async (receiverId: string, text: string, socketRef: React.MutableRefObject<any>) => {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit(
        'chat:direct:send',
        { senderId: currentMemberId, receiverId, text: normalizedText },
        (ack: { ok: boolean; message?: DirectMessage; error?: string }) => {
          if (!ack?.ok) {
            triggerAlert('error', ack?.error || 'Failed to send message.');
          } else if (ack.message) {
            setMessages(prev => upsertMessage(prev, ack.message!));
          }
        }
      );
      return;
    }

    try {
      const res = await apiFetch('/api/erp/message', {
        method: 'POST',
        body: JSON.stringify({ senderId: currentMemberId, receiverId, text: normalizedText }),
      });
      if (res.ok) {
        await fetchMessages();
        triggerAlert('success', 'Message dispatched successfully!');
      } else {
        triggerAlert('error', 'Server failed to save direct message.');
      }
    } catch {
      triggerAlert('error', 'Connection error routing chat stream.');
    }
  }, [apiFetch, currentMemberId, fetchMessages, triggerAlert]);

  const handleLogout = useCallback(() => {
    setCurrentMemberId('');
    setAuthToken('');
    setAuthRoleType('');
    setAuthMemberId('');
    setManagerViewModeState('manager');
    setCurrentScreen('home');
    localStorage.removeItem('syncspace_current_member_id');
    localStorage.removeItem('syncspace_auth_token');
    localStorage.removeItem('syncspace_auth_role_type');
    localStorage.removeItem('syncspace_auth_member_id');
    localStorage.removeItem('syncspace_manager_view');
    triggerAlert('info', 'Logged out successfully from remote ERP session.');
  }, [triggerAlert, setCurrentMemberId]);

  // ---- Derived values ----
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMember = members.find(m => m.id === currentMemberId);
  const teamLeads = members.filter(m => m.isTL);
  const punchesForToday = currentMember
    ? punches.filter(p => p.userId === currentMemberId && p.date === todayStr)
    : [];
  const activeWorklog = currentMember
    ? (worklogs.find(w => w.userId === currentMemberId && w.date === todayStr) || null)
    : null;
  const activeShiftAttendees = members.filter(m => m.punchStatus === 'Active').length;
  const breakShiftAttendees = members.filter(m => m.punchStatus === 'Break').length;
  const submittedLogsTodayCount = worklogs.filter(w => w.date === todayStr).length;

  const effectiveRoleType: TeamMember['roleType'] =
    authRoleType === 'Manager' && managerViewMode === 'engineer'
      ? 'Engineer'
      : ((currentMember?.roleType ?? authRoleType ?? 'Engineer') as TeamMember['roleType']);
  const effectiveMember: TeamMember | null = currentMember
    ? { ...currentMember, roleType: effectiveRoleType }
    : null;

  return {
  members, punches, worklogs, tasks, sentEmailsLog, messages, projects, attendance,
  authToken, authRoleType, authMemberId, currentMemberId,
  dataLoading, punchLoading, logLoading, emailLoading,
  taskLoading, projectLoading, profileLoading, authLoading,
  currentScreen, managerViewMode, activeTab, systemAlert,
  currentMember, effectiveMember, effectiveRoleType,
  teamLeads, todayStr, punchesForToday, activeWorklog,
  activeShiftAttendees, breakShiftAttendees, submittedLogsTodayCount,
  setMessages, setCurrentMemberId, setCurrentScreen,
  setManagerViewMode, setActiveTab,
  triggerAlert, handleProfileSwitch,
    handlePunch, handleAppendWorklogItem, handleDeleteWorklogItem, handleSendEmail,
  handleAssignTask, handleCreateProject, handleDeleteProject,
  handleUpdateTaskStatus, handleAddTaskComment,
  handleUpdateTaskSubtasks, handleUpdateTaskDetails,
  handleRegisterUser, handleUpdateUserRole, handleUpdateProfile,
  handleForgotPassword, handleResetPassword,
  handleManagerGeneratePasswordReset, handleSendMessage,
  handleLogout, refetchAll, fetchMessages,
  fetchAttendance, fetchAttendanceForMonth,
};
}
