import React, { useState, useEffect } from 'react';
import { TeamMember, WorkLog } from '../types';
import { Mail, Send, CheckCircle2, FileEdit } from 'lucide-react';

interface EmailDraftCardProps {
  worklog: WorkLog | null;
  currentMember: TeamMember;
  members: TeamMember[];
  onSendEmail: (worklogId: string | undefined, subject: string, body: string, recipientId: string) => Promise<void>;
  loading: boolean;
}

export default function EmailDraftCard({ worklog, currentMember, members, onSendEmail, loading }: EmailDraftCardProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipientId, setRecipientId] = useState('ALL');
  const isSent = Boolean(worklog?.sentToTl);

  useEffect(() => {
    if (worklog) {
      setSubject(worklog.emailSubject || `Daily Activity Report - (${worklog.date})`);
      setBody(worklog.emailDraft || '');
      setRecipientId('ALL');
    }
  }, [worklog?.id]);

  useEffect(() => {
    if (isSent) {
      setSubject('');
      setBody('');
      setRecipientId('ALL');
    }
  }, [isSent]);

  const handleSend = async () => {
    await onSendEmail(worklog?.id, subject, body, recipientId);
  };

  const handleCancel = () => {
    setSubject('');
    setBody('');
    setRecipientId('ALL');
  };

  const selectedRecipient = recipientId === 'ALL' ? null : members.find(member => member.id === recipientId) || null;
  const recipientLabel = recipientId === 'ALL' ? 'All Members' : (selectedRecipient?.name || 'Selected User');

  return (
    <div className="bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 text-left">
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#5a6e53]" />
          <h3 className="font-bold text-[#3d403a] font-serif text-base">Email Dispatch Desk</h3>
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
          disabled={loading}
          className="w-full text-xs font-bold px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75]"
        >
          <option value="ALL">ALL members of this organization</option>
          {members.map(member => (
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
          disabled={loading}
          className="w-full text-xs font-bold px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75]"
        />
      </div>

      {/* Email Body TextArea */}
      <div className="mb-5">
        <label className="flex items-center gap-1 text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-1">
          <FileEdit className="w-3 h-3" /> Email Update Draft Body
        </label>
        <textarea
          rows={7}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={loading}
          className="w-full text-xs px-3.5 py-2.5 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl text-[#3d403a] leading-relaxed focus:outline-none focus:border-[#5a6e53]/70 focus:ring-1 focus:ring-[#5a6e53]/70 transition-all duration-200 disabled:bg-[#f4f1e8]/30 disabled:text-[#7a7d75] font-sans whitespace-pre-wrap"
        />
      </div>

      {/* Action button */}
      {isSent && worklog ? (
        <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Mail sent successfully to {recipientLabel} at {new Date(worklog.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</span>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={loading && !subject && !body}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white hover:bg-[#f4f1e8] text-[#3d403a] border border-[#e2dfd2] rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !subject.trim() || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#5a6e53] hover:bg-[#485942] text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> Send Mail to {recipientLabel}
          </button>
        </div>
      )}
    </div>
  );
}
