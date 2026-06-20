import React, { useRef, useEffect, useState } from 'react';
import { useErpState } from './hooks/useErpState';
import { useChatSocket } from './hooks/useChatSocket';
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import { createApiFetch } from './api/apiFetch';

export default function App() {
  const erp = useErpState();

  const [unseenSenders, setUnseenSenders] = useState<Map<string, number>>(new Map());
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
  });

  const totalUnseen = Array.from(unseenSenders.values()).reduce((s, n) => s + n, 0);

  const handleLogin = async (email: string, password: string) => {
    const apiFetch = createApiFetch('', '');
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
        window.location.reload();
      } else {
        const err = await res.json();
        erp.triggerAlert('error', err.error || 'Invalid corporate credentials.');
      }
    } catch {
      erp.triggerAlert('error', 'Network failure connecting authentication gateway.');
    }
  };

  if (!erp.authToken || !erp.currentMember) {
    return (
      <AuthScreen
        systemAlert={erp.systemAlert}
        authLoading={erp.authLoading}
        onLogin={handleLogin}
        onRegister={erp.handleRegisterUser}
        onForgotPassword={erp.handleForgotPassword}
        onResetPassword={erp.handleResetPassword}
      />
    );
  }

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
        onLogout={erp.handleLogout}
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
      projects={erp.projects}
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
      handleLogout={erp.handleLogout}
      refetchAll={erp.refetchAll}
      onFetchTasks={erp.fetchTaskList}
      onFetchAttendanceMonth={erp.fetchAttendanceForMonth}
    />
  );
}
