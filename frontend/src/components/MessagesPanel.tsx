import React, { useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { TeamMember, DirectMessage, MessageContact, OnlineMessageUser } from '../types';

interface MessagesPanelProps {
  currentMember: TeamMember;
  members: TeamMember[];
  contacts: MessageContact[];
  onlineUsers: OnlineMessageUser[];
  messages: DirectMessage[];
  unseenSenders: Map<string, number>;
  selectedChatUserId: string;
  typedMessage: string;
  onSelectUser: (id: string) => void;
  onTypedMessageChange: (v: string) => void;
  onSend: (receiverId: string, text: string) => void;
}

export default function MessagesPanel({
  currentMember,
  members,
  contacts,
  onlineUsers,
  messages,
  unseenSenders,
  selectedChatUserId,
  typedMessage,
  onSelectUser,
  onTypedMessageChange,
  onSend,
}: MessagesPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChatUserId]);

  const threadMessages = messages.filter(
    msg =>
      (msg.senderId === currentMember.id && msg.receiverId === selectedChatUserId) ||
      (msg.senderId === selectedChatUserId && msg.receiverId === currentMember.id)
  );

  const correspondent = members.find(m => m.id === selectedChatUserId);
  const selectedContact = contacts.find(c => c.contactId === selectedChatUserId);
  const visibleOnlineUsers = onlineUsers.filter(user => user.userId !== currentMember.id);

  const handleSend = () => {
    if (typedMessage.trim() && selectedChatUserId) {
      onSend(selectedChatUserId, typedMessage);
      onTypedMessageChange('');
    }
  };

  return (
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
        {/* Member list */}
        <div className="md:col-span-1 border-r border-[#e2dfd2]/60 pr-4 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono text-left">Online Users (Socket Presence)</span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {visibleOnlineUsers.length === 0 && (
              <div className="text-[10px] text-slate-400 italic px-1">No users online right now.</div>
            )}
            {visibleOnlineUsers.map(onlineUser => {
                const m = members.find(member => member.id === onlineUser.userId);
                const count = unseenSenders.get(onlineUser.userId) || 0;
                return (
                  <button
                    key={onlineUser.userId}
                    onClick={() => onSelectUser(onlineUser.userId)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      selectedChatUserId === onlineUser.userId
                        ? 'bg-[#5a6e53]/10 text-[#2d3a2a] border border-[#5a6e53]/35 font-bold'
                        : count > 0
                          ? 'bg-red-50 border border-red-200 text-[#3d403a]'
                          : 'hover:bg-[#f4f1e8]/30 text-[#3d403a]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img src={m?.avatar || currentMember.avatar} alt={m?.name || onlineUser.name} className="w-6 h-6 rounded-full object-cover border" referrerPolicy="no-referrer" />
                        {count > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 leading-none">
                            {count > 9 ? '9+' : count}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{m?.name || onlineUser.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono italic leading-none">{onlineUser.roleType}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded leading-none shrink-0 bg-emerald-100 text-emerald-800">
                      Online
                    </span>
                  </button>
                );
              })}
          </div>

          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono text-left pt-2">Recent Contacts</span>
          <div className="space-y-1.5 max-h-39 overflow-y-auto">
            {contacts.map(contact => {
                const m = members.find(member => member.id === contact.contactId);
                const count = unseenSenders.get(contact.contactId) || 0;
                return (
                  <button
                    key={contact.contactId}
                    onClick={() => onSelectUser(contact.contactId)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      selectedChatUserId === contact.contactId
                        ? 'bg-[#5a6e53]/10 text-[#2d3a2a] border border-[#5a6e53]/35 font-bold'
                        : count > 0
                          ? 'bg-red-50 border border-red-200 text-[#3d403a]'
                          : 'hover:bg-[#f4f1e8]/30 text-[#3d403a]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <img src={m?.avatar || contact.contactAvatar || currentMember.avatar} alt={m?.name || contact.contactName} className="w-6 h-6 rounded-full object-cover border" referrerPolicy="no-referrer" />
                        {count > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center px-0.5 leading-none">
                            {count > 9 ? '9+' : count}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{m?.name || contact.contactName}</p>
                        <p className="text-[10px] text-slate-400 font-mono italic leading-none">{m?.roleType || 'Contact'}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded leading-none shrink-0 ${m?.punchStatus === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {m?.punchStatus || 'Unknown'}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Chat thread */}
        <div className="md:col-span-2 flex flex-col justify-between min-h-80">
          {selectedChatUserId ? (
            <>
              <div className="space-y-3 overflow-y-auto max-h-61 pr-1 flex-1 mb-4 text-left">
                {threadMessages.length === 0 ? (
                  <div className="text-center py-12 text-[#7a7d75] italic text-[11px]">
                    No past communications with {correspondent?.name || selectedContact?.contactName || 'this correspondent'}. Write a diagnostic message below!
                  </div>
                ) : (
                  threadMessages.map(msg => {
                    const isMe = msg.senderId === currentMember.id;
                    return (
                      <div key={msg.id} className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${isMe ? 'bg-[#5a6e53] text-white ml-auto rounded-tr-none' : 'bg-[#f4f1e8] text-[#3d403a] mr-auto rounded-tl-none'}`}>
                        <p className="font-bold text-[9px] opacity-75 font-mono uppercase mb-0.5">
                          {isMe ? 'You' : msg.senderName} · {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p>{msg.text}</p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={e => onTypedMessageChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                  placeholder="Write secure workspace correspondence..."
                  className="flex-1 text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]"
                />
                <button onClick={handleSend} className="bg-[#5a6e53] hover:opacity-90 text-white p-2.5 rounded-xl cursor-pointer">
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
  );
}
