import React, { useState, useEffect } from 'react';
import { TeamMember, WorkLog } from '../types';
import { Mail, Send, CheckCircle2, FileEdit } from 'lucide-react';

interface EmailDraftCardProps {
  worklog: WorkLog | null;
  currentMember: TeamMember;
  members: TeamMember[];
  onSendEmail: (worklogId: string, subject: string, body: string, recipientId: string) => Promise<void>;
  loading: boolean;
}

export default function EmailDraftCard({ worklog, currentMember, members, onSendEmail, loading }: EmailDraftCardProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientId, setRecipientId] = useState('ALL');

  // Sync inputs with selected worklog whenever it updates
  useEffect(() => {
    if (worklog) {
      setSubject(worklog.emailSubject || `Daily Activity Report - (${worklog.date})`);
      setBody(worklog.emailDraft || '');
      setRecipientId('ALL');
    } else {
      setSubject('');
      setBody('');
    }
  }, [worklog]);

  const handleSend = async () => {
    if (!worklog) return;
    await onSendEmail(worklog.id, subject, body, recipientId);
  };

  const selectedRecipient = recipientId === 'ALL' ? null : members.find(member => member.id === recipientId) || null;
  const recipientLabel = recipientId === 'ALL' ? 'All Members' : (selectedRecipient?.name || 'Selected User');

  if (!worklog) {
    return (
      <div className="bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 min-h-[300px] flex flex-col justify-center items-center text-center">
        <div className="p-4 bg-[#f4f1e8]/60 border border-[#e2dfd2]/60 rounded-full mb-4">
          <Mail className="w-6 h-6 text-[#7a7d75] opacity-80" />
        </div>
        <h3 className="font-bold text-[#3d403a] font-serif text-sm">Supervisor Updates Portal</h3>
        <p className="text-xs text-[#7a7d75] max-w-[240px] mt-2 leading-relaxed">
          Submit today's activity logs first to prepare your supervisor update draft.
        </p>
      </div>
    );
  }

  const isSent = worklog.sentToTl;

  return (
    <div className="bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#5a6e53]" />
          <h3 className="font-bold text-[#3d403a] font-serif text-base">Supervisor Update Portal</h3>
        </div>
        {isSent ? (
          <span className="flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched
          </span>
        ) : (
          <span className="text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Pending Dispatch
          </span>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-1">
          Recipient
        </label>
        <select
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
          disabled={isSent || loading}
          className="w-full text-xs font-bold px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75]"
        >
          <option value="ALL">ALL members of this organization</option>
          {members.filter(member => member.id !== currentMember.id).map(member => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.roleType})
            </option>
          ))}
        </select>
      </div>

      {/* Subject Line input */}
      <div className="mb-4">
        <label className="block text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-1">
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={isSent || loading}
          className="w-full text-xs font-bold px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75]"
        />
      </div>

      {/* Email Body TextArea */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-1 flex items-center gap-1">
          <FileEdit className="w-3 h-3" /> Email Update Draft Body
        </label>
        <textarea
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSent || loading}
          className="w-full text-xs px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] leading-relaxed focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75] font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Action button */}
      {!isSent ? (
        <button
          onClick={handleSend}
          disabled={loading || !subject.trim() || !body.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#5a6e53] hover:bg-[#485942] text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Send Mail to {recipientLabel}
        </button>
      ) : (
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Mail sent successfully to {recipientLabel} at {new Date(worklog.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span>
        </div>
      )}
    </div>
  );
}
