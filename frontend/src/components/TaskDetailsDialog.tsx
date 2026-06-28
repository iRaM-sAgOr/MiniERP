import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  Calendar, 
  Clock, 
  User, 
  Send,
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  History, 
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Flame,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { TeamMember, TaskDistribution, TaskSubtask } from '../types';

interface TaskDetailsDialogProps {
  task: TaskDistribution;
  members: TeamMember[];
  currentMember: TeamMember;
  onClose: () => void;
  onUpdateStatus: (taskId: string, status: 'Pending' | 'In Progress' | 'Completed') => Promise<void>;
  onAddComment: (taskId: string, text: string) => Promise<void>;
  onUpdateSubtasks: (taskId: string, subtasks: TaskSubtask[]) => Promise<void>;
  onUpdateDetails: (taskId: string, updates: any) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  loading: boolean;
}

export default function TaskDetailsDialog({
  task,
  members,
  currentMember,
  onClose,
  onUpdateStatus,
  onAddComment,
  onUpdateSubtasks,
  onUpdateDetails,
  onDeleteTask,
  loading
}: TaskDetailsDialogProps) {
  const [commentText, setCommentText] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editHours, setEditHours] = useState(task.estimatedHours || 12);
  const [editStartDate, setEditStartDate] = useState(task.startDate || '');
  const [editEndDate, setEditEndDate] = useState(task.endDate || task.dueDate || '');

  const isManager = currentMember.roleType === 'Manager' || task.assignedBy === currentMember.id;
  const canDelete = Boolean(onDeleteTask) && (
    currentMember.roleType === 'Manager' ||
    task.assignedTo === currentMember.id ||
    task.assignedBy === currentMember.id
  );

  const handleDelete = async () => {
    if (!onDeleteTask) return;
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    await onDeleteTask(task.id);
    onClose();
  };
  const assignedToMember = members.find(m => m.id === task.assignedTo);
  const assignedByMember = members.find(m => m.id === task.assignedBy);

  // Comments sorted newest first or oldest first? Oldest first makes sense for chronological discussion
  const sortedComments = [...(task.comments || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // History sorted newest first for instant audit monitoring
  const sortedHistory = [...(task.history || [])].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 1. Hours Progress Metrics
  const actual = task.actualHours || 0;
  const estimated = task.estimatedHours || 12;
  const hoursPercent = Math.min(100, Math.round((actual / estimated) * 100));
  const isOverworked = actual > estimated;

  // 2. Subtasks Progress Metrics
  const totalSubtasks = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await onAddComment(task.id, commentText.trim());
    setCommentText('');
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    
    const newSub: TaskSubtask = {
      id: "sub_" + Math.random().toString(36).substr(2, 9),
      title: newSubtaskTitle.trim(),
      isCompleted: false
    };

    const updated = [...(task.subtasks || []), newSub];
    await onUpdateSubtasks(task.id, updated);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    const updated = (task.subtasks || []).map(s => 
      s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s
    );
    await onUpdateSubtasks(task.id, updated);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const updated = (task.subtasks || []).filter(s => s.id !== subtaskId);
    await onUpdateSubtasks(task.id, updated);
  };

  const handleSaveChanges = async () => {
    await onUpdateDetails(task.id, {
      title: editTitle,
      description: editDesc,
      priority: editPriority,
      estimatedHours: Number(editHours),
      startDate: editStartDate,
      endDate: editEndDate
    });
    setIsEditing(false);
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'creation': return '🏗️';
      case 'status_change': return '⚡';
      case 'comment': return '💬';
      case 'subtask_toggle': return '🔘';
      case 'subtask_add': return '➕';
      case 'subtask_delete': return '🗑️';
      case 'edit': return '📝';
      default: return '📍';
    }
  };

  const renderRichText = (txt: string) => {
    if (!txt) return null;
    const lines = txt.split('\n');
    return lines.map((line, lineIdx) => {
      const parts: React.ReactNode[] = [];
      let keyIndex = 0;
      const inlineRegex = /(\*\*([^\*]+)\*\*|\*([^\*]+)\*|`([^`]+)`)/g;
      let match;
      let lastIndex = 0;
      while ((match = inlineRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${lineIdx}-${keyIndex++}`}>{line.substring(lastIndex, match.index)}</span>);
        }
        const fullMatch = match[0];
        if (fullMatch.startsWith('**')) {
          parts.push(<strong key={`bold-${lineIdx}-${keyIndex++}`} className="font-extrabold text-slate-900">{match[2]}</strong>);
        } else if (fullMatch.startsWith('*')) {
          parts.push(<em key={`italic-${lineIdx}-${keyIndex++}`} className="italic text-slate-800">{match[3]}</em>);
        } else if (fullMatch.startsWith('`')) {
          parts.push(<code key={`code-${lineIdx}-${keyIndex++}`} className="font-mono bg-slate-100/80 text-rose-600 px-1 py-0.5 rounded text-[10px]">{match[4]}</code>);
        }
        lastIndex = inlineRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(<span key={`text-${lineIdx}-${keyIndex++}`}>{line.substring(lastIndex)}</span>);
      }
      return (
        <div key={`line-${lineIdx}`} className="min-h-[1.2rem]">
          {parts.length > 0 ? parts : ' '}
        </div>
      );
    });
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'High': return 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
      case 'Medium': return 'bg-amber-50 border-amber-200 text-amber-700 font-bold';
      case 'Low': return 'bg-blue-50 border-blue-200 text-blue-700 font-medium';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in" id="erp-task-details-modal">
      <div className="bg-white border border-[#e2dfd2] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-up">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-[#e2dfd2] p-5 bg-[#fdfcf8] text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-[#5a6e53] px-2 py-0.5 rounded border border-emerald-100 uppercase">
                  📂 {task.projectName}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md ${getPriorityColor(task.priority)}`}>
                  Priority: {task.priority}
                </span>
              </div>
              <h2 className="text-base font-bold text-[#2d3a2a] font-serif tracking-tight mt-1">
                Enterprise Work Package Details
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1 px-3 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700 flex items-center gap-1 font-mono text-xs font-bold"
          >
            Close <X className="w-4 h-4 text-slate-500" />
          </button>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="p-1 px-3 hover:bg-rose-50 rounded-xl transition-colors text-rose-500 hover:text-rose-700 border border-rose-200 flex items-center gap-1 font-mono text-xs font-bold disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Main Title & Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Title / Info Segment */}
            <div className="md:col-span-2 space-y-4 text-left">
              {isEditing ? (
                <div className="space-y-3 bg-[#f4f1e8]/20 border border-[#e2dfd2] p-4 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-[#5a6e53] uppercase tracking-wider mb-2">Edit Task Specifications</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5a6e53]">Task Title</label>
                    <input
                      type="text"
                      className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#5a6e53]">Instructions / Scope Description</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] resize-none"
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6e53]">Allocated Estimation (hours)</label>
                      <input
                        type="number"
                        className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-2 py-1.5 font-mono text-center"
                        value={editHours}
                        onChange={e => setEditHours(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6e53]">Task Priority</label>
                      <select
                        className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-2 py-1.5 focus:outline-none"
                        value={editPriority}
                        onChange={e => setEditPriority(e.target.value as any)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6e53]">Start Date</label>
                      <input
                        type="date"
                        className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-2 py-1.5 font-mono"
                        value={editStartDate}
                        onChange={e => setEditStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6e53]">End / Due Date</label>
                      <input
                        type="date"
                        className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-2 py-1.5 font-mono"
                        value={editEndDate}
                        onChange={e => setEditEndDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 border border-[#e2dfd2] hover:bg-white text-slate-600 rounded-xl text-[10px] uppercase font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      className="px-4 py-1.5 bg-[#5a6e53] hover:opacity-90 text-white rounded-xl text-[10px] uppercase font-bold flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Save Specs
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h1 className="text-xl font-bold font-serif text-[#2d3a2a] leading-snug tracking-tight">
                      {task.title}
                    </h1>
                    {isManager && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-[#5a6e53] hover:bg-[#f4f1e8] rounded-xl border border-[#e2dfd2] transition-colors"
                        title="Edit specifications"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 font-sans text-xs min-h-[70px] whitespace-pre-line leading-relaxed">
                    {task.description || "No execution parameters or documentation provided for this item."}
                  </div>
                </div>
              )}

              {/* Progress Bars Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* 1. Time Scope Log Progress Bar */}
                <div className="p-4 bg-[#fdfcf8] border border-[#e2dfd2]/80 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#5a6e53] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#d4a373]" /> Hour Budget Progress
                    </span>
                    <span className="font-mono font-bold text-slate-700">{hoursPercent}%</span>
                  </div>
                  
                  {/* Real visual Progress bar track */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/55">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverworked 
                          ? 'bg-rose-500 animate-pulse' 
                          : hoursPercent > 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${hoursPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono leading-tight pt-1">
                    <span className="text-slate-500 uppercase text-[9px] font-bold">Spent: <strong className="text-slate-800">{actual}h</strong></span>
                    <span className="text-slate-500 uppercase text-[9px] font-bold">Estimate: <strong className="text-slate-800">{estimated}h</strong></span>
                  </div>

                  {isOverworked && (
                    <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg font-bold font-sans">
                      <Flame className="w-3 h-3 text-rose-500 animate-bounce" /> 
                      OVER CAPACITY BY {actual - estimated}h
                    </div>
                  )}
                </div>

                {/* 2. Subtask Checklist Progress Bar */}
                <div className="p-4 bg-[#fdfcf8] border border-[#e2dfd2]/80 rounded-2xl text-left space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-[#5a6e53] flex items-center gap-1">
                      <CheckSquare className="w-3.5 h-3.5 text-[#5a6e53]" /> Deliverable Steps Progress
                    </span>
                    <span className="font-mono font-bold text-slate-700">{subtaskPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/55">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                      style={{ width: `${subtaskPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono leading-tight pt-1">
                    <span className="text-[#5a6e53] uppercase text-[9px] font-extrabold">{completedSubtasks} of {totalSubtasks} steps done</span>
                    <span className="text-[#d4a373] text-[9.5px] font-bold uppercase">{subtaskPercent === 100 ? '✅ Ready!' : 'Pending'}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Side Task Status Controller Panel */}
            <div className="bg-[#f4f1e8]/20 border border-[#e2dfd2]/80 p-5 rounded-3xl space-y-4 text-left">
              <div>
                <h3 className="text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-2">Resource Schedulers</h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-[#5a6e53] shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono uppercase block text-slate-400">Owner Assignee:</span>
                      <span className="font-bold text-[#3d403a] font-sans">{assignedToMember ? assignedToMember.name : "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-[#5a6e53] shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono uppercase block text-slate-400">Execution Block:</span>
                      <span className="font-bold text-[#3d403a] font-mono">{task.startDate || "N/A"} to {task.endDate || task.dueDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-slate-600">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#5a6e53] shrink-0" />
                    <div>
                      <span className="text-[9px] font-mono uppercase block text-slate-400 font-bold">Authorized Lead:</span>
                      <span className="font-semibold text-slate-500">{assignedByMember ? assignedByMember.name : "System Team Lead"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-bold text-[#7a7d75] uppercase tracking-wider mb-2">Transition State</h3>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    onClick={() => onUpdateStatus(task.id, 'Pending')}
                    disabled={loading || task.status === 'Pending'}
                    className={`py-1.5 text-xs text-center border font-bold rounded-xl transition-all cursor-pointer ${
                      task.status === 'Pending' 
                        ? 'bg-[#5a6e53]/10 border-[#5a6e53]/30 text-[#5a6e53]' 
                        : 'bg-white border-[#e2dfd2] text-[#3d403a] hover:bg-[#f4f1e8]'
                    }`}
                  >
                    🔘 Pending Backlog
                  </button>
                  <button
                    onClick={() => onUpdateStatus(task.id, 'In Progress')}
                    disabled={loading || task.status === 'In Progress'}
                    className={`py-1.5 text-xs text-center border font-bold rounded-xl transition-all cursor-pointer ${
                      task.status === 'In Progress' 
                        ? 'bg-[#d4a373]/10 border-[#d4a373]/30 text-[#d4a373]' 
                        : 'bg-white border-[#e2dfd2] text-[#3d403a] hover:bg-[#f4f1e8]'
                    }`}
                  >
                    ⚡ Active Development
                  </button>
                  <button
                    onClick={() => onUpdateStatus(task.id, 'Completed')}
                    disabled={loading || task.status === 'Completed'}
                    className={`py-1.5 text-xs text-center border font-bold rounded-xl transition-all cursor-pointer ${
                      task.status === 'Completed' 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-white border-[#e2dfd2] text-[#3d403a] hover:bg-[#f4f1e8]'
                    }`}
                  >
                    ✅ Milestone Signed & Completed
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#e2dfd2] text-[10px] text-[#7a7d75] font-sans leading-relaxed">
                Logged work entries with corresponding Task IDs dynamically increment the actual hours metrics.
              </div>

            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-[#e2dfd2]/60">
            
            {/* Left side column: Subtask checklist management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#2d3a2a] text-xs font-serif uppercase tracking-wider flex items-center gap-1.5">
                  🎯 Execution Checklist Deliverables ({totalSubtasks})
                </h3>
              </div>

              {/* New Subtask Submit Form */}
              <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Insert subtask objective to track..."
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-1.5 text-[#3d403a] placeholder-slate-300 focus:outline-[#5a6e53]"
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 bg-white text-[#5a6e53] border border-[#e2dfd2] rounded-xl hover:bg-[#f4f1e8] font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Subtasks List */}
              {totalSubtasks === 0 ? (
                <div className="p-8 border border-dashed border-[#e2dfd2] rounded-2xl text-center bg-slate-50/50">
                  <p className="text-[11px] text-slate-400 font-mono">No subtasks defined. Define checklist milestones above to track incremental completion progress.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {(task.subtasks || []).map((sub) => (
                    <div 
                      key={sub.id} 
                      className="p-2 px-3 bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl flex items-center justify-between gap-2 hover:bg-[#f4f1e8]/20 transition-all text-left"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(sub.id)}
                        className="flex items-center gap-2.5 text-xs text-[#3d403a] font-medium flex-1 cursor-pointer select-none text-left"
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          sub.isCompleted 
                            ? 'bg-[#5a6e53] border-[#5a6e53] text-white' 
                            : 'border-[#e2dfd2] bg-white hover:border-[#5a6e53]/60'
                        }`}>
                          {sub.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`leading-normal ${sub.isCompleted ? 'line-through text-slate-400 font-normal' : ''}`}>
                          {sub.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-300 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side column: Comments Stream */}
            <div className="space-y-4">
              <h3 className="font-bold text-[#2d3a2a] text-xs font-serif uppercase tracking-wider flex items-center gap-1.5">
                💬 Communication & Discussion Notes ({sortedComments.length})
              </h3>

              {/* Comments Feed */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {sortedComments.length === 0 ? (
                  <div className="p-8 border border-dashed border-[#e2dfd2] rounded-2xl text-center bg-slate-50/50">
                    <p className="text-[11px] text-slate-400 font-mono">No notes recorded. Initiate task sync discussions below.</p>
                  </div>
                ) : (
                  sortedComments.map((com) => {
                    const commentAuthor = members.find(m => m.id === com.authorId);
                    return (
                      <div key={com.id} className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex gap-2.5 text-left">
                        <div className="w-6 h-6 rounded-full bg-[#f4f1e8] text-[#5a6e53] flex items-center justify-center font-bold text-[10px] uppercase border shrink-0">
                          {com.authorName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-xs font-bold text-slate-800 leading-none">{com.authorName}</span>
                            <span className="text-[9px] text-slate-450 font-mono">{new Date(com.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-[11px] text-[#4d504a] font-sans leading-relaxed whitespace-pre-wrap pr-1 break-words bg-white border border-slate-100/60 rounded-xl p-2.5 mt-1 space-y-1">
                            {renderRichText(com.text)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Comment submit form with rich-text textarea */}
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="border border-[#e2dfd2] rounded-xl bg-[#fdfcf8] focus-within:ring-1 focus-within:ring-[#5a6e53] focus-within:border-[#5a6e53] transition-all overflow-hidden">
                  
                  {/* Rich Text Snippets Toolbar */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-[#e2dfd2]/60 text-slate-400 select-none">
                    <span className="font-bold text-[9px] text-[#5a6e53] tracking-widest mr-2">WIDGET TOOLBAR</span>
                    <button
                      type="button"
                      onClick={() => setCommentText(prev => prev + "**bold**")}
                      className="hover:text-slate-800 hover:bg-slate-200/60 px-1.5 py-0.5 rounded font-black text-xs transition-colors cursor-pointer text-center"
                      title="Bold text formatting markup"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentText(prev => prev + "*italic*")}
                      className="hover:text-slate-800 hover:bg-slate-200/60 px-1.5 py-0.5 rounded italic text-xs transition-colors cursor-pointer font-serif text-center"
                      title="Italic text formatting markup"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentText(prev => prev + "`code`")}
                      className="hover:text-slate-800 hover:bg-slate-200/60 px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors cursor-pointer text-center"
                      title="Monospace inline code markup"
                    >
                      &lt;/&gt;
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentText(prev => prev + "\n- ")}
                      className="hover:text-slate-800 hover:bg-slate-200/60 px-1.5 py-0.5 rounded text-[10px] font-sans font-bold transition-colors cursor-pointer text-center"
                      title="Bulleted list layout"
                    >
                      • List
                    </button>
                    <span className="ml-auto text-[9px] font-mono text-slate-400 font-medium">
                      {commentText.length} characters
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Provide a rich-text comment update, request, or inline logs. Press Submit to record..."
                    className="w-full text-xs bg-transparent px-3 py-2 text-[#3d403a] placeholder-slate-350 focus:outline-none resize-none leading-relaxed block border-0"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#7a7d75] font-mono">
                    * Formatting uses classic lightweight markdown tokens.
                  </span>
                  <button
                    type="submit"
                    disabled={!commentText.trim() || loading}
                    className="px-4 py-2 bg-[#5a6e53] hover:opacity-90 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Post Comment
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Bottom Task Audit History Trail (Section 4) */}
          <div className="pt-6 border-t border-[#e2dfd2]/60 space-y-3">
            <h3 className="font-bold text-[#2d3a2a] text-xs font-serif uppercase tracking-wider flex items-center gap-1.5 text-left">
              <History className="w-4 h-4 text-[#5a6e53]" /> System Audit Log History ({sortedHistory.length} actions)
            </h3>

            <div className="bg-[#fcfcfa] border border-[#e2dfd2]/60 rounded-2xl p-4 overflow-hidden">
              <div className="divide-y divide-slate-100 max-h-[160px] overflow-y-auto pr-1">
                {sortedHistory.map((hist) => (
                  <div key={hist.id} className="py-2 flex items-start gap-3 text-xs text-left">
                    <span className="text-sm shrink-0 mt-0.5">{getEventIcon(hist.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-[#3d403a] font-sans">{hist.actorName}</span>
                        <span className="text-slate-500 font-sans">{hist.detail}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        {new Date(hist.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-[#fdfcf8] border-t border-[#e2dfd2] flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[#d4a373] animate-pulse" /> Unified Relational ERP Task Distribution Engine (UTC-6)
        </div>

      </div>
    </div>
  );
}
