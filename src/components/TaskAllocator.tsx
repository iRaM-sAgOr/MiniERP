import React, { useState } from 'react';
import { PlusCircle, HelpCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { TeamMember, TaskDistribution } from '../types';

interface TaskAllocatorProps {
  currentMember: TeamMember;
  members: TeamMember[];
  onAssignTask: (taskData: {
    title: string;
    description: string;
    assignedTo: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
  }) => Promise<void>;
  loading: boolean;
}

export default function TaskAllocator({
  currentMember,
  members,
  onAssignTask,
  loading
}: TaskAllocatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState(() => members[0]?.id || '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [dueDate, setDueDate] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate.toISOString().split('T')[0];
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !assignedTo) return;
    
    await onAssignTask({
      title,
      description,
      assignedTo,
      priority,
      dueDate
    });

    setTitle('');
    setDescription('');
  };

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm" id="erp-task-allocation-panel">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">Distribute work items</h3>
          <p className="text-xs text-[#7a7d75]">Assign priority tasks and align workloads across the remote team</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Task Title</label>
            <input
              type="text"
              placeholder="e.g., Conduct routing loop audit"
              required
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans"
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Assign To Remote Member</label>
            <select
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans"
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              disabled={loading}
            >
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Task Description</label>
          <input
            type="text"
            placeholder="e.g., Review Vite middleware logs to analyze routing integrity in development containers"
            className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans"
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Task Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 px-3 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                    priority === p
                      ? 'bg-[#5a6e53] text-white border-[#5a6e53]'
                      : 'bg-white hover:bg-[#f4f1e8] border-[#e2dfd2] text-[#3d403a]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Due Deadline Date</label>
            <input
              type="date"
              required
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-mono"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* TL Disclaimer Warning if member isn't a TL */}
        {!currentMember.isTL && (
          <div className="flex items-start gap-2 p-3 bg-[#fdfceb] border border-[#e9e4cc] rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-800 leading-normal font-sans">
              <strong>Interactive Notice:</strong> You are currently acting as an Employee. ERP systems usually restrict work allocations to Team Leads. You have complete developer credentials enabled here to assign tasks for testing purposes!
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !title}
          className="w-full flex items-center justify-center gap-1.5 bg-[#5a6e53] hover:opacity-90 text-white font-bold text-xs rounded-xl py-2.5 px-4 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-[#d4a373]" />
          Assign Work To Candidate
        </button>
      </form>
    </div>
  );
}
