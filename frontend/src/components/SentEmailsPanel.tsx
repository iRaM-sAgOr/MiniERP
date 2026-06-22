import React from 'react';
import { TeamMember, SentEmailLogPage } from '../types';

interface SentEmailsPanelProps {
  sentEmailsLog: SentEmailLogPage | null;
  currentMember: TeamMember;
  currentMemberId: string;
  members: TeamMember[];
  effectiveRoleType: TeamMember['roleType'];
  dayPage: number;
  onPrevDayPage: () => void;
  onNextDayPage: () => void;
}

export default function SentEmailsPanel({
  sentEmailsLog,
  currentMember,
  currentMemberId,
  members,
  effectiveRoleType,
  dayPage,
  onPrevDayPage,
  onNextDayPage,
}: SentEmailsPanelProps) {
  const isManager = effectiveRoleType === 'Manager';
  const dayBuckets = sentEmailsLog?.dayBuckets || [];
  const totalPages = sentEmailsLog?.pagination?.totalDayPages || 1;
  const hasPrev = sentEmailsLog?.pagination?.hasPrev || false;
  const hasNext = sentEmailsLog?.pagination?.hasNext || false;

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2] mb-4">
        <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">TL Dispatch & Send Log Index</h3>
        <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] px-2.5 py-0.5 rounded-lg border border-[#e2dfd2]/60">
          Date pages: {dayPage}/{totalPages}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 mb-4">
        <button
          onClick={onPrevDayPage}
          disabled={!hasPrev}
          className="px-2.5 py-1 text-[11px] rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40"
        >
          Prev 5 days
        </button>
        <button
          onClick={onNextDayPage}
          disabled={!hasNext}
          className="px-2.5 py-1 text-[11px] rounded-lg border border-[#e2dfd2] bg-white disabled:opacity-40"
        >
          Next 5 days
        </button>
      </div>

      {dayBuckets.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/20">
          <p className="text-[#7a7d75] text-xs font-semibold">No recorded dispatch emails for this profile yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-75 overflow-y-auto pr-1">
          {dayBuckets.map(bucket => (
            <div key={bucket.day} className="space-y-2">
              <h4 className="text-[11px] font-bold text-[#5a6e53] font-mono border-b border-[#e2dfd2] pb-1">{bucket.day}</h4>
              {bucket.items
                .filter(log => isManager || log.senderId === currentMemberId)
                .map(log => {
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
          ))}
        </div>
      )}
    </div>
  );
}
