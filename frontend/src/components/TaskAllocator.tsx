import React, { useEffect, useState } from 'react';
import { PlusCircle, AlertCircle, FileSpreadsheet, FolderKanban, Info } from 'lucide-react';
import { TeamMember, EnterpriseProject } from '../types';

interface TaskAllocatorProps {
  currentMember: TeamMember;
  members: TeamMember[];
  projects?: EnterpriseProject[];
  managerProjects?: EnterpriseProject[];
  onAssignTask: (taskData: {
    title: string;
    description: string;
    assignedTo: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
    projectName: string;
    estimatedHours: number;
    startDate: string;
    endDate: string;
  }) => Promise<void>;
  onCreateProject?: (name: string, description: string) => Promise<void>;
  onUpdateProject?: (projectId: string, payload: {
    name?: string;
    description?: string;
    githubRepoUrl?: string;
    notionUrl?: string;
    milestonePlan?: string;
    standardChecklist?: string;
    releasePlanUrl?: string;
    status?: 'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive';
  }) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  loading: boolean;
}

export default function TaskAllocator({
  currentMember,
  members,
  projects = [],
  managerProjects = [],
  onAssignTask,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  loading
}: TaskAllocatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const isManager = currentMember.roleType === 'Manager';
  const [assignedTo, setAssignedTo] = useState(() => {
    return isManager ? (members.find(m => m.id !== currentMember.id)?.id || currentMember.id) : currentMember.id;
  });

  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  
  const [selectedProject, setSelectedProject] = useState(() => {
    return projects[0]?.name || '';
  });

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProject('');
      return;
    }

    const projectExists = projects.some(project => project.name === selectedProject);
    if (!projectExists) {
      setSelectedProject(projects[0].name);
    }
  }, [projects, selectedProject]);

  const [estimatedHours, setEstimatedHours] = useState<number>(12);

  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dueDate, setDueDate] = useState(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    return defaultDate.toISOString().split('T')[0];
  });

  // Project Creation states
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  const registryProjects = isManager ? managerProjects : projects;

  const selectedProjectDetails = registryProjects.find(project => project.name === selectedProject) || null;

  const [projectStatus, setProjectStatus] = useState<'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive'>('Planning');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [notionUrl, setNotionUrl] = useState('');
  const [releasePlanUrl, setReleasePlanUrl] = useState('');
  const [milestonePlan, setMilestonePlan] = useState('');
  const [standardChecklist, setStandardChecklist] = useState('');

  useEffect(() => {
    if (!selectedProjectDetails) {
      setProjectStatus('Planning');
      setGithubRepoUrl('');
      setNotionUrl('');
      setReleasePlanUrl('');
      setMilestonePlan('');
      setStandardChecklist('');
      return;
    }

    setProjectStatus((selectedProjectDetails.status as 'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive') || 'Planning');
    setGithubRepoUrl(selectedProjectDetails.githubRepoUrl || '');
    setNotionUrl(selectedProjectDetails.notionUrl || '');
    setReleasePlanUrl(selectedProjectDetails.releasePlanUrl || '');
    setMilestonePlan(selectedProjectDetails.milestonePlan || '');
    setStandardChecklist(selectedProjectDetails.standardChecklist || '');
  }, [selectedProjectDetails?.id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedProject) return;

    // Engineers must self-assign tasks
    const targetAssignee = isManager ? assignedTo : currentMember.id;

    await onAssignTask({
      title,
      description,
      assignedTo: targetAssignee,
      priority,
      dueDate,
      projectName: selectedProject,
      estimatedHours: Number(estimatedHours),
      startDate,
      endDate: dueDate
    });

    setTitle('');
    setDescription('');
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !onCreateProject) return;
    await onCreateProject(newProjName.trim(), newProjDesc.trim());
    setNewProjName('');
    setNewProjDesc('');
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!onDeleteProject) return;
    const confirmed = window.confirm(`Delete project \"${projectName}\"?`);
    if (!confirmed) return;
    await onDeleteProject(projectId);
  };

  const handleToggleProjectStatus = async (project: EnterpriseProject) => {
    if (!isManager || !onUpdateProject) return;
    const currentStatus = project.status || 'Planning';
    const nextStatus: 'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive' =
      currentStatus === 'Inactive' ? 'Active' : 'Inactive';

    const confirmed = window.confirm(
      `${nextStatus === 'Inactive' ? 'Mark' : 'Reactivate'} project "${project.name}" as ${nextStatus}?`
    );
    if (!confirmed) return;

    await onUpdateProject(project.id, { status: nextStatus });
  };

  const handleUpdateProjectDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManager || !onUpdateProject || !selectedProjectDetails) return;

    await onUpdateProject(selectedProjectDetails.id, {
      status: projectStatus,
      githubRepoUrl,
      notionUrl,
      releasePlanUrl,
      milestonePlan,
      standardChecklist,
    });
  };

  return (
    <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm animate-fade-in" id="erp-task-allocation-panel">
      
      {/* Top Banner Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#e2dfd2] mb-6 flex-wrap gap-4 text-left">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">
              {isManager ? 'Standard Work Item Distribution' : 'Self-Assign Task Backlog'}
            </h3>
            <p className="text-xs text-[#7a7d75]">
              {isManager 
                ? 'Issue structured tasks, assign estimated times, and direct core development' 
                : 'Publish self-assigned objectives to let project managers track your execution schedules'}
            </p>
          </div>
        </div>
        
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-[#5a6e53] px-3 py-1 rounded-full border border-emerald-100">
          📍 Mode: {currentMember.roleType}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Task Creation Form */}
        <form onSubmit={handleCreateTask} className="lg:col-span-2 space-y-4 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-[#5a6e53] uppercase block mb-1">Associated Project Portfolio</label>
              <select
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans cursor-pointer"
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                disabled={loading}
              >
                {projects.length === 0 && (
                  <option value="">No projects available</option>
                )}
                {projects.map(p => (
                  <option key={p.id} value={p.name}>
                    📂 {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#5a6e53] uppercase block mb-1">Task Title</label>
              <input
                type="text"
                placeholder="e.g., Optimize SQL indexing arrays"
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[#5a6e53] uppercase block mb-1">Task Description / Instructions</label>
            <input
              type="text"
              placeholder="Provide context or links for remote developers..."
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#3d403a] block mb-1">Task Assignee</label>
              {isManager ? (
                <select
                  className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-sans cursor-pointer"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                  disabled={loading}
                >
                  <option value={currentMember.id}>Myself ({currentMember.name})</option>
                  {members.filter(m => m.id !== currentMember.id).map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-[#f4f1e8]/40 border border-[#e2dfd2] px-3 py-2 rounded-xl text-xs font-semibold text-[#5a6e53] font-sans">
                  🔒 Locked to Self (Engineer Self-Assignment)
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3d403a] block mb-1">Scope Assigned Duration (Hours)</label>
              <input
                type="number"
                min="1"
                max="300"
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-mono text-center font-bold"
                value={estimatedHours}
                onChange={e => setEstimatedHours(Number(e.target.value))}
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-[#3d403a] block mb-1">Task Priority</label>
              <div className="grid grid-cols-3 gap-1">
                {(['Low', 'Medium', 'High'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-1.5 text-[10px] font-mono font-bold rounded-xl border text-center transition-all cursor-pointer ${
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
              <label className="text-xs font-semibold text-[#3d403a] block mb-1">Active Start Date</label>
              <input
                type="date"
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-none focus:ring-1 focus:ring-[#5a6e53]/30 font-mono"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#3d403a] block mb-1">Expected Completion Deadline</label>
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

          {!isManager && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <Info className="w-4 h-4 text-[#5a6e53] mt-0.5 shrink-0" />
              <p className="text-[10px] text-emerald-800 leading-normal font-sans">
                <strong>Self-Assignment Feature:</strong> As an Engineer, you have direct authorization to self-allocate deliverables. Your logged work entries will compile against this assigned item on the central timeline metrics dashboard.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title || !selectedProject}
            className="w-full flex items-center justify-center gap-1.5 bg-[#5a6e53] hover:opacity-90 text-white font-bold text-xs rounded-xl py-2.5 px-4 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#d4a373]" />
            {isManager ? 'Publish Assignment to Developer' : 'Initialize Self-Assigned Task'}
          </button>
        </form>

        {/* Project metadata and lifecycle panel */}
        <div className="border-[#e2dfd2] lg:border-l lg:pl-8 space-y-4 text-left">
          <div className="p-4 bg-[#f4f1e8]/30 border border-[#e2dfd2] rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <FolderKanban className="w-4 h-4 text-[#5a6e53]" />
              <h4 className="text-xs font-bold text-[#2d3a2a] uppercase tracking-wider">Initialize Project</h4>
            </div>
            
            {isManager ? (
              <form onSubmit={handleCreateProjectSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-[#7a7d75] uppercase block mb-1">Project Portfolio Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Azure Cloud Sync"
                    className="w-full text-xs bg-white border border-[#e2dfd2] focus:border-[#5a6e53] focus:outline-none rounded-xl px-2.5 py-1.5 font-sans text-[#3d403a]"
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#7a7d75] uppercase block mb-1">Overview Context</label>
                  <textarea
                    rows={2}
                    placeholder="Scope, requirements or repository details..."
                    className="w-full text-xs bg-white border border-[#e2dfd2] focus:border-[#5a6e53] focus:outline-none rounded-xl px-2.5 py-1.5 font-sans text-[#3d403a] resize-none"
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newProjName}
                  className="w-full py-1.5 px-3 bg-white hover:bg-[#f4f1e8] text-[#5a6e53] border border-[#e2dfd2] text-[10px] font-extrabold uppercase rounded-xl transition-all cursor-pointer"
                >
                  Create Project Portfolio
                </button>
              </form>
            ) : (
              <p className="text-[10px] text-[#7a7d75] leading-normal font-sans">
                Only managers and team leads can create new project portfolios. Please request your assigned manager for project creation access.
              </p>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Project Information Hub</h4>

            {registryProjects.length > 0 ? (
              <>
                <div>
                  <label className="text-[10px] font-bold text-[#7a7d75] uppercase block mb-1">Selected Project</label>
                  <select
                    className="w-full text-xs bg-white border border-[#e2dfd2] rounded-xl px-2.5 py-1.5 text-[#3d403a] focus:outline-none"
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                    disabled={loading}
                  >
                    {registryProjects.map(proj => (
                      <option key={proj.id} value={proj.name}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-[11px] text-[#3d403a] bg-white border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Status</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#e2dfd2] bg-[#f4f1e8]">
                      {selectedProjectDetails?.status || 'Planning'}
                    </span>
                  </div>
                  {selectedProjectDetails?.description && <p className="text-[10px] text-[#7a7d75]">{selectedProjectDetails.description}</p>}
                  <div className="grid grid-cols-1 gap-1 text-[10px]">
                    <a href={selectedProjectDetails?.githubRepoUrl || '#'} target="_blank" rel="noreferrer" className={`truncate ${selectedProjectDetails?.githubRepoUrl ? 'text-blue-700 underline' : 'text-[#9aa09a] cursor-default pointer-events-none'}`}>GitHub Repository</a>
                    <a href={selectedProjectDetails?.notionUrl || '#'} target="_blank" rel="noreferrer" className={`truncate ${selectedProjectDetails?.notionUrl ? 'text-blue-700 underline' : 'text-[#9aa09a] cursor-default pointer-events-none'}`}>Notion Workspace</a>
                    <a href={selectedProjectDetails?.releasePlanUrl || '#'} target="_blank" rel="noreferrer" className={`truncate ${selectedProjectDetails?.releasePlanUrl ? 'text-blue-700 underline' : 'text-[#9aa09a] cursor-default pointer-events-none'}`}>Release Plan Document</a>
                  </div>
                  {selectedProjectDetails?.milestonePlan && (
                    <div>
                      <p className="font-semibold text-[10px] mb-1">Milestone Plan</p>
                      <pre className="text-[10px] whitespace-pre-wrap bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg p-2 max-h-24 overflow-y-auto">{selectedProjectDetails.milestonePlan}</pre>
                    </div>
                  )}
                  {selectedProjectDetails?.standardChecklist && (
                    <div>
                      <p className="font-semibold text-[10px] mb-1">Standard Checklist</p>
                      <pre className="text-[10px] whitespace-pre-wrap bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg p-2 max-h-24 overflow-y-auto">{selectedProjectDetails.standardChecklist}</pre>
                    </div>
                  )}
                </div>

                {isManager && onUpdateProject && selectedProjectDetails && (
                  <form onSubmit={handleUpdateProjectDetails} className="space-y-2 bg-white border border-[#e2dfd2] rounded-xl p-3">
                    <h5 className="text-[10px] font-extrabold text-[#5a6e53] uppercase tracking-wider">Manager Edit Mode</h5>
                    <select
                      className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1"
                      value={projectStatus}
                      onChange={e => setProjectStatus(e.target.value as 'Planning' | 'Active' | 'Blocked' | 'Completed' | 'Inactive')}
                    >
                      <option value="Planning">Planning</option>
                      <option value="Active">Active</option>
                      <option value="Blocked">Blocked</option>
                      <option value="Completed">Completed</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                    <input type="url" placeholder="GitHub Repo URL" value={githubRepoUrl} onChange={e => setGithubRepoUrl(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1" />
                    <input type="url" placeholder="Notion URL" value={notionUrl} onChange={e => setNotionUrl(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1" />
                    <input type="url" placeholder="Release Plan URL" value={releasePlanUrl} onChange={e => setReleasePlanUrl(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1" />
                    <textarea rows={3} placeholder="Milestone Plan" value={milestonePlan} onChange={e => setMilestonePlan(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1 resize-none" />
                    <textarea rows={3} placeholder="Standard Checklist" value={standardChecklist} onChange={e => setStandardChecklist(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-lg px-2 py-1 resize-none" />
                    <button type="submit" disabled={loading} className="w-full py-1.5 px-3 bg-[#5a6e53] hover:opacity-90 text-white text-[10px] font-extrabold uppercase rounded-xl disabled:opacity-50">
                      Save Project Information
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p className="text-[10px] text-[#7a7d75]">No projects found yet. Create one first to maintain repository links, milestones, checklist and release plan details.</p>
            )}

            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {registryProjects.map((proj) => (
                <div key={proj.id} className="text-left py-1.5 px-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-[#2d3a2a] block">📁 {proj.name}</span>
                    <span className={`inline-block mt-0.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      (proj.status || 'Planning') === 'Inactive'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {proj.status || 'Planning'}
                    </span>
                    {proj.description && <span className="text-[10px] text-[#7a7d75] block mt-0.5 max-w-[200px] truncate">{proj.description}</span>}
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {isManager && onUpdateProject && (
                      <button
                        type="button"
                        onClick={() => handleToggleProjectStatus(proj)}
                        disabled={loading}
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border disabled:opacity-50 ${
                          (proj.status || 'Planning') === 'Inactive'
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                        }`}
                      >
                        {(proj.status || 'Planning') === 'Inactive' ? 'Activate' : 'Inactivate'}
                      </button>
                    )}
                    {isManager && onDeleteProject && (proj.status || 'Planning') !== 'Inactive' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(proj.id, proj.name)}
                        disabled={loading}
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Inactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
