import React from 'react';
import { TeamMember } from '../types';

interface SentEmailsPanelProps {
  sentEmailsLog: any[];
  currentMember: TeamMember;
  currentMemberId: string;
  members: TeamMember[];
  effectiveRoleType: TeamMember['roleType'];
}

export default function SentEmailsPanel({
  sentEmailsLog,
  currentMember,
  currentMemberId,
  members,
  effectiveRoleType,
}: SentEmailsPanelProps) {
  const isManager = effectiveRoleType === 'Manager';
  const filteredEmails = isManager
    ? sentEmailsLog
    : sentEmailsLog.filter((log: any) => log.senderId === currentMemberId);

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2] mb-4">
        <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">TL Dispatch & Send Log Index</h3>
        <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] px-2.5 py-0.5 rounded-lg border border-[#e2dfd2]/60">
          Total sent: {filteredEmails.length}
        </span>
      </div>

      {filteredEmails.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/20">
          <p className="text-[#7a7d75] text-xs font-semibold">No recorded dispatch emails for this profile yet.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-75 overflow-y-auto pr-1">
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
      )}
    </div>
  );
}
