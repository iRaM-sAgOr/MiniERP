import React, { useState, useEffect } from 'react';
import { Mail, Copy, Check, Send, ExternalLink, RefreshCw } from 'lucide-react';
import { WorkLog } from '../types';

interface EmailDraftCardProps {
  worklog: WorkLog | null;
  onSendEmail: (worklogId: string, customSubject: string, customBody: string) => Promise<void>;
  loading: boolean;
}

export default function EmailDraftCard({ worklog, onSendEmail, loading }: EmailDraftCardProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (worklog) {
      setSubject(worklog.emailSubject || '');
      setBody(worklog.emailDraft || '');
    } else {
      setSubject('');
      setBody('');
    }
  }, [worklog]);

  const handleCopy = () => {
    if (!body) return;
    const fullText = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!worklog) return;
    await onSendEmail(worklog.id, subject, body);
  };

  const getMailtoLink = () => {
    if (!worklog) return '#';
    const emailTo = encodeURIComponent(worklog.assignedTL.email);
    const emailSubject = encodeURIComponent(subject);
    const emailBody = encodeURIComponent(body);
    return `mailto:${emailTo}?subject=${emailSubject}&body=${emailBody}`;
  };

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full min-h-[400px]" id="erp-email-draft-card-panel">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e2dfd2]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">TL Email Portal</h3>
              <p className="text-xs text-[#7a7d75]">Review & deploy professional daily log summaries</p>
            </div>
          </div>
          {worklog?.sentToTl && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold border border-emerald-200">
              Dispatched successfully
            </span>
          )}
        </div>

        {!worklog ? (
          <div className="flex flex-col items-center justify-center text-center py-24 px-4 bg-[#f4f1e8]/20 border border-dashed border-[#e2dfd2] rounded-2xl min-h-[300px]">
            <p className="text-[#3d403a] font-medium text-xs max-w-xs mb-3">
              No draft created yet. Complete daily task logs and click &apos;Submit Log&apos; to trigger Gemini drafting.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Headers representation */}
            <div className="space-y-1 bg-[#f4f1e8]/30 p-3.5 border border-[#e2dfd2]/80 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-[#7a7d75] font-mono">To:</span>
                <span className="text-[#3d403a] font-bold font-sans">
                  {worklog.assignedTL.name} &lt;{worklog.assignedTL.email}&gt;
                </span>
              </div>
              <div className="flex justify-between pt-1 pb-1 border-y border-[#e2dfd2]/50 my-1">
                <span className="text-[#7a7d75] font-mono">Date:</span>
                <span className="text-[#3d403a] font-mono font-semibold">{worklog.date} (Today)</span>
              </div>
              <div className="flex items-center gap-2 pt-1 font-sans">
                <span className="text-[#7a7d75] font-mono">Subject:</span>
                <input
                  type="text"
                  className="flex-1 bg-transparent border-0 font-semibold text-[#3d403a] focus:ring-0 p-0 text-xs font-sans placeholder-slate-400 outline-none"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            </div>

            {/* Email Body Draft */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#5a6e53] block mb-1">Email Body Draft (Editable)</label>
              <textarea
                className="w-full h-44 text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl p-3 text-[#3d403a] outline-none placeholder-slate-400 font-sans leading-relaxed"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{ resize: 'none' }}
              />
            </div>
            
            {/* Gemini Tag */}
            {worklog.aiSummarized && (
              <div className="p-3 bg-[#f4f1e8]/45 border border-[#e2dfd2]/80 rounded-xl animate-pulse">
                <span className="text-[10px] text-[#5a6e53] font-mono font-bold uppercase tracking-wider block mb-0.5">Gemini Executive Summary</span>
                <p className="text-[11px] text-[#3d403a] italic leading-snug font-sans">&quot;{worklog.aiSummarized}&quot;</p>
              </div>
            )}
          </div>
        )}
      </div>

      {worklog && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#e2dfd2]">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1 border border-[#e2dfd2] hover:bg-[#f4f1e8] text-[#3d403a] bg-white rounded-xl py-2 px-3 text-[11px] font-bold transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5a6e53]" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {/* Mailto Mail client Button */}
          <a
            href={getMailtoLink()}
            className="flex items-center justify-center gap-1 border border-[#e2dfd2] hover:bg-[#f4f1e8] text-[#3d403a] bg-white rounded-xl py-2 px-3 text-[11px] font-bold text-center transition-colors cursor-pointer"
            title="Open mail draft in local email app"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#5a6e53]" />
            Client
          </a>

          {/* Send Mock Log Button */}
          <button
            onClick={handleSend}
            disabled={loading}
            className="flex items-center justify-center gap-1 text-white bg-[#d4a373] hover:bg-[#c39262] rounded-xl py-2 px-3 text-[11px] font-bold disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
          >
            <Send className="w-3 h-3 text-white" />
            Dispatch
          </button>
        </div>
      )}
    </div>
  );
}
