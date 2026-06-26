import React, { useRef, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useErpState } from './hooks/useErpState';
import { useChatSocket } from './hooks/useChatSocket';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import { createApiFetch } from './api/apiFetch';
import { OnlineMessageUser } from './types';

// ─── Login page ──────────────────────────────────────────────────────────────
// Rendered at "/" — useErpState is NOT called here, so zero API requests fire
// before the user authenticates.
function LoginPage() {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(false);
  const [systemAlert, setSystemAlert] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const triggerAlert = (type: 'success' | 'error' | 'info', text: string) => {
    setSystemAlert({ type, text });
    setTimeout(() => setSystemAlert(null), 5000);
  };

  const handleLogin = async (email: string, password: string) => {
    const apiFetch = createApiFetch('', '');
    setAuthLoading(true);
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('syncspace_current_member_id', data.member.id);
        localStorage.setItem('syncspace_auth_token', data.token);
        localStorage.setItem('syncspace_auth_role_type', data.member.roleType || 'Engineer');
        localStorage.setItem('syncspace_auth_member_id', data.member.id);
        navigate('/dashboard', { replace: true });
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Invalid corporate credentials.');
      }
    } catch {
      triggerAlert('error', 'Network failure connecting authentication gateway.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (userData: any) => {
    const apiFetch = createApiFetch('', '');
    setAuthLoading(true);
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('syncspace_current_member_id', data.member.id);
        localStorage.setItem('syncspace_auth_token', data.token);
        localStorage.setItem('syncspace_auth_role_type', data.member.roleType || 'Engineer');
        localStorage.setItem('syncspace_auth_member_id', data.member.id);
        navigate('/dashboard', { replace: true });
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Registration failed.');
      }
    } catch {
      triggerAlert('error', 'Network failure during registration.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    const apiFetch = createApiFetch('', '');
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
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
    }
  };

  const handleResetPassword = async (email: string, token: string, newPassword: string) => {
    const apiFetch = createApiFetch('', '');
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, newPassword }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        triggerAlert('success', 'Password has been reset. Please login with your new password.');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Unable to reset password.');
      }
    } catch {
      triggerAlert('error', 'Network failure while resetting password.');
    }
  };

  return (
    <AuthScreen
      systemAlert={systemAlert}
      authLoading={authLoading}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onForgotPassword={handleForgotPassword}
      onResetPassword={handleResetPassword}
    />
  );
}

// ─── Dashboard app ────────────────────────────────────────────────────────────
// Rendered at "/dashboard" — useErpState is called here, so API requests
// only fire after the user has authenticated and navigated to this route.
function DashboardApp() {
  const navigate = useNavigate();
  const erp = useErpState();

  const [unseenSenders, setUnseenSenders] = useState<Map<string, number>>(new Map());
  const [onlineMessageUsers, setOnlineMessageUsers] = useState<OnlineMessageUser[]>([]);
  const activeTabRef = useRef(erp.activeTab);
  useEffect(() => { activeTabRef.current = erp.activeTab; }, [erp.activeTab]);

  const [selectedChatUserIdGlobal, setSelectedChatUserIdGlobal] = useState('');
  const selectedChatUserIdRef = useRef(selectedChatUserIdGlobal);
  useEffect(() => { selectedChatUserIdRef.current = selectedChatUserIdGlobal; }, [selectedChatUserIdGlobal]);

  useEffect(() => {
    if (erp.activeTab === 'messages' && selectedChatUserIdGlobal) {
      setUnseenSenders(prev => {
        if (!prev.has(selectedChatUserIdGlobal)) return prev;
        const next = new Map(prev);
        next.delete(selectedChatUserIdGlobal);
        return next;
      });
    }
  }, [erp.activeTab, selectedChatUserIdGlobal, erp.messages]);

  const socketRef = useChatSocket({
    authToken: erp.authToken,
    currentMemberId: erp.currentMemberId,
    activeTabRef,
    selectedChatUserIdRef,
    onNewMessage: updater => erp.setMessages(updater),
    onUnseenUpdate: senderId => {
      setUnseenSenders(prev => {
        const next = new Map(prev);
        next.set(senderId, (next.get(senderId) || 0) + 1);
        return next;
      });
    },
    onPresenceSync: users => setOnlineMessageUsers(users),
  });

  const totalUnseen = Array.from(unseenSenders.values()).reduce((s, n) => s + n, 0);

  // If the token is gone (expired / logged out), redirect back to login
  if (!erp.authToken) {
    return <Navigate to="/" replace />;
  }

  // Still loading initial member list — show spinner rather than a blank/broken screen
  if (!erp.currentMember) {
    return (
      <div className="min-h-screen bg-[#fbfaf5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#5a6e53]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs font-mono text-[#5a6e53] font-bold uppercase tracking-widest animate-pulse">Establishing ERP database tunnels...</p>
        </div>
      </div>
    );
  }

  // Override logout to navigate to "/" after clearing storage
  const handleLogout = () => {
    erp.handleLogout();
    navigate('/', { replace: true });
  };

  const handleToggleManagerViewMode = () => {
    const next = erp.managerViewMode === 'manager' ? 'engineer' : 'manager';
    erp.setManagerViewMode(next);
    if (next === 'engineer' && erp.authMemberId) {
      erp.setCurrentMemberId(erp.authMemberId);
    }
  };

  if (erp.currentScreen === 'home') {
    return (
      <HomeScreen
        currentMember={erp.currentMember}
        effectiveMember={erp.effectiveMember!}
        effectiveRoleType={erp.effectiveRoleType}
        authRoleType={erp.authRoleType}
        managerViewMode={erp.managerViewMode}
        todayStr={erp.todayStr}
        activeWorklog={erp.activeWorklog}
        activeShiftAttendees={erp.activeShiftAttendees}
        breakShiftAttendees={erp.breakShiftAttendees}
        submittedLogsTodayCount={erp.submittedLogsTodayCount}
        tasks={erp.tasks}
        currentMemberId={erp.currentMemberId}
        unseenCount={totalUnseen}
        systemAlert={erp.systemAlert}
        onSetScreen={erp.setCurrentScreen}
        onSetActiveTab={erp.setActiveTab}
        onToggleManagerViewMode={handleToggleManagerViewMode}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <DashboardScreen
      members={erp.members}
      punches={erp.punches}
      worklogs={erp.worklogs}
      tasks={erp.tasks}
      sentEmailsLog={erp.sentEmailsLog}
      messages={erp.messages}
      messageContacts={erp.messageContacts}
      onlineMessageUsers={onlineMessageUsers}
      projects={erp.projects}
      managerProjects={erp.managerProjects}
      authRoleType={erp.authRoleType}
      authMemberId={erp.authMemberId}
      currentMemberId={erp.currentMemberId}
      managerViewMode={erp.managerViewMode}
      currentMember={erp.currentMember}
      effectiveMember={erp.effectiveMember!}
      effectiveRoleType={erp.effectiveRoleType}
      teamLeads={erp.teamLeads}
      todayStr={erp.todayStr}
      attendance={erp.attendance}
      activeWorklog={erp.activeWorklog}
      activeShiftAttendees={erp.activeShiftAttendees}
      breakShiftAttendees={erp.breakShiftAttendees}
      submittedLogsTodayCount={erp.submittedLogsTodayCount}
      dataLoading={erp.dataLoading}
      punchLoading={erp.punchLoading}
      logLoading={erp.logLoading}
      emailLoading={erp.emailLoading}
      taskLoading={erp.taskLoading}
      projectLoading={erp.projectLoading}
      profileLoading={erp.profileLoading}
      authLoading={erp.authLoading}
      activeTab={erp.activeTab}
      systemAlert={erp.systemAlert}
      unseenSenders={unseenSenders}
      setActiveTab={erp.setActiveTab}
      setCurrentMemberId={erp.setCurrentMemberId}
      setCurrentScreen={erp.setCurrentScreen}
      setManagerViewMode={erp.setManagerViewMode}
      setMessages={erp.setMessages}
      socketRef={socketRef}
      triggerAlert={erp.triggerAlert}
      handleProfileSwitch={erp.handleProfileSwitch}
      handlePunch={erp.handlePunch}
      handleAppendWorklogItem={erp.handleAppendWorklogItem}
      handleDeleteWorklogItem={erp.handleDeleteWorklogItem}
      handleSendEmail={erp.handleSendEmail}
      handleAssignTask={erp.handleAssignTask}
      handleCreateProject={erp.handleCreateProject}
      handleUpdateProject={erp.handleUpdateProject}
      handleDeleteProject={erp.handleDeleteProject}
      handleUpdateTaskStatus={erp.handleUpdateTaskStatus}
      handleAddTaskComment={erp.handleAddTaskComment}
      handleUpdateTaskSubtasks={erp.handleUpdateTaskSubtasks}
      handleUpdateTaskDetails={erp.handleUpdateTaskDetails}
      handleRegisterUser={erp.handleRegisterUser}
      handleUpdateUserRole={erp.handleUpdateUserRole}
      handleUpdateProfile={erp.handleUpdateProfile}
      handleManagerGeneratePasswordReset={erp.handleManagerGeneratePasswordReset}
      handleSendMessage={erp.handleSendMessage}
      handleLogout={handleLogout}
      refetchAll={erp.refetchAll}
      onFetchMessageContacts={erp.fetchMessageContacts}
      onFetchConversationMessages={erp.fetchConversationMessages}
      onFetchSentEmailLogs={erp.fetchSentEmailLogs}
      onFetchTasks={erp.fetchTaskList}
      onFetchAttendanceMonth={erp.fetchAttendanceForMonth}
    />
  );
}

// ─── Root router ──────────────────────────────────────────────────────────────
export default function App() {
  const hasToken = Boolean(localStorage.getItem('syncspace_auth_token'));
  return (
    <Routes>
      <Route path="/" element={hasToken ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<DashboardApp />} />
      {/* Any unknown path goes to login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
