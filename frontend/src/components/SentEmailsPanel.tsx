import React, { useState } from 'react';
import { Inbox, Send } from 'lucide-react';
import { TeamMember, SentEmailLogPage, SentEmailLogEntry } from '../types';

type EmailBoxTab = 'sentbox' | 'inbox';

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
  const [activeBox, setActiveBox] = useState<EmailBoxTab>('inbox');
  const isManager = effectiveRoleType === 'Manager';
  const allBuckets = sentEmailsLog?.dayBuckets || [];
  const totalPages = sentEmailsLog?.pagination?.totalDayPages || 1;
  const hasPrev = sentEmailsLog?.pagination?.hasPrev || false;
  const hasNext = sentEmailsLog?.pagination?.hasNext || false;

  // Filter all items across buckets for counting tab badges
  const allItems: SentEmailLogEntry[] = allBuckets.flatMap(b => b.items);
  const sentboxCount = allItems.filter(log => log.senderId === currentMemberId).length;
  const inboxCount = allItems.filter(
    log =>
      (log.receiverEmail === currentMember.email || log.receiverEmail === 'all@minierp.local') &&
      log.senderId !== currentMemberId
  ).length;

  const filterBucket = (items: SentEmailLogEntry[]) => {
    if (activeBox === 'sentbox') {
      return items.filter(log => log.senderId === currentMemberId);
    }
    // inbox: received by me (from others)
    return items.filter(
      log =>
        (log.receiverEmail === currentMember.email || log.receiverEmail === 'all@minierp.local') &&
        log.senderId !== currentMemberId
    );
  };

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-[#e2dfd2] mb-4">
        <h3 className="font-semibold text-[#2d3a2a] text-sm font-serif">TL Dispatch & Send Log Index</h3>
        <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] px-2.5 py-0.5 rounded-lg border border-[#e2dfd2]/60">
          Date pages: {dayPage}/{totalPages}
        </span>
      </div>

      {/* Sentbox / Inbox toggle */}
      <div className="flex gap-1.5 mb-4 bg-[#f4f1e8]/50 border border-[#e2dfd2] rounded-xl p-1">
        <button
          onClick={() => setActiveBox('inbox')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeBox === 'inbox' ? 'bg-white text-[#2d3a2a] shadow-sm border border-[#e2dfd2]' : 'text-[#7a7d75] hover:text-[#3d403a]'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Inbox
          {inboxCount > 0 && (
            <span className="min-w-4 h-4 bg-[#5a6e53] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1">
              {inboxCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveBox('sentbox')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeBox === 'sentbox' ? 'bg-white text-[#2d3a2a] shadow-sm border border-[#e2dfd2]' : 'text-[#7a7d75] hover:text-[#3d403a]'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Sentbox
          {sentboxCount > 0 && (
            <span className="min-w-4 h-4 bg-[#7a7d75] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1">
              {sentboxCount}
            </span>
          )}
        </button>
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

      {(() => {
        const visibleBuckets = allBuckets
          .map(bucket => ({ ...bucket, items: filterBucket(bucket.items) }))
          .filter(bucket => bucket.items.length > 0);

        if (visibleBuckets.length === 0) {
          return (
            <div className="text-center py-20 border border-dashed border-[#e2dfd2] rounded-2xl bg-[#f4f1e8]/20">
              <p className="text-[#7a7d75] text-xs font-semibold">
                {activeBox === 'inbox' ? 'No emails received yet.' : 'No emails sent yet.'}
              </p>
            </div>
          );
        }

        return (
          <div className="space-y-3 max-h-75 overflow-y-auto pr-1">
            {visibleBuckets.map(bucket => (
              <div key={bucket.day} className="space-y-2">
                <h4 className="text-[11px] font-bold text-[#5a6e53] font-mono border-b border-[#e2dfd2] pb-1">{bucket.day}</h4>
                {bucket.items.map(log => {
                  const sender = members.find(m => m.id === log.senderId);
                  const isMine = log.senderId === currentMemberId;
                  return (
                    <div key={log.id} className="p-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-2xl text-left hover:bg-[#f4f1e8]/30 transition-colors">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-[#3d403a] leading-tight">{log.subject}</h4>
                          <p className="text-[11px] text-[#7a7d75] mt-0.5">
                            {isMine
                              ? <>To {log.receiverName} <span className="text-[10px]">&lt;{log.receiverEmail}&gt;</span></>
                              : <>From <span className="font-semibold text-[#3d403a]">{sender?.name || 'Unknown'}</span> to {log.receiverName}</>
                            }
                          </p>
                        </div>
                        <span className="bg-[#f4f1e8] text-[#5a6e53] text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-[#e2dfd2]/60">
                          {isMine ? 'Sent' : 'Received'}
                        </span>
                      </div>
                      <pre className="mt-2 p-2 bg-[#fdfcf8] border border-[#e2dfd2]/60 rounded-xl text-[10px] text-[#3d403a] font-sans whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                        {log.body}
                      </pre>
                      <span className="block text-right text-[9px] text-[#7a7d75] font-mono mt-1 font-bold">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
