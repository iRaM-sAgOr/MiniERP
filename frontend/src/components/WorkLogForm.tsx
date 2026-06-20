import React, { useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, FolderKanban } from "lucide-react";
import { TeamMember, LogItem, WorkLog, TaskDistribution, EnterpriseProject, TaskListQuery, TaskListResult } from "../types";

interface WorkLogFormProps {
  currentMember: TeamMember;
  teamLeads: TeamMember[];
  savedWorkLog: WorkLog | null;
  onAppendItem: (item: LogItem, tlId: string) => Promise<void>;
  onDeleteWorklogItem: (worklogId: string, itemId: string) => Promise<void>;
  onSearchTasks: (query?: TaskListQuery) => Promise<TaskListResult>;
  loading: boolean;
  projects?: EnterpriseProject[];
}

const CATEGORIES: LogItem["category"][] = ["Feature", "Bugfix", "Meeting", "Research", "Documentation", "Support"];

export default function WorkLogForm({
  currentMember,
  teamLeads,
  savedWorkLog,
  onAppendItem,
  onDeleteWorklogItem,
  onSearchTasks,
  loading,
  projects = [],
}: WorkLogFormProps) {
  const items = savedWorkLog?.items || [];

  const [project, setProject] = useState("");
  const [category, setCategory] = useState<LogItem["category"]>("Feature");
  const [description, setDescription] = useState("");
  const [hoursSpent, setHoursSpent] = useState<number>(1);
  const [githubLink, setGithubLink] = useState("");
  const [associatedTaskId, setAssociatedTaskId] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [showTaskResults, setShowTaskResults] = useState(false);
  const [taskSearchResults, setTaskSearchResults] = useState<TaskDistribution[]>([]);
  const [taskSearchLoading, setTaskSearchLoading] = useState(false);
  const [selectedTLId, setSelectedTLId] = useState(() => {
    const reportLead = teamLeads.find((l) => l.id === currentMember.tlId);
    return reportLead ? reportLead.id : teamLeads[0]?.id || "";
  });

  useEffect(() => {
    if (!showTaskResults) return;
    const timeoutId = setTimeout(async () => {
      setTaskSearchLoading(true);
      try {
        const result = await onSearchTasks({
          page: 1,
          pageSize: 10,
          search: taskSearch,
          includeCompleted: false,
        });
        setTaskSearchResults(result.tasks || []);
      } finally {
        setTaskSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [taskSearch, showTaskResults, onSearchTasks]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !description || hoursSpent <= 0 || !associatedTaskId) {
      return;
    }

    const newItem: LogItem = {
      project,
      category,
      description,
      hoursSpent: Number(hoursSpent),
      githubLink: githubLink.trim() || undefined,
      taskId: associatedTaskId || undefined,
    };
    await onAppendItem(newItem, selectedTLId);
    setProject("");
    setDescription("");
    setHoursSpent(1);
    setGithubLink("");
    setTaskSearch("");
    setAssociatedTaskId("");
    setShowTaskResults(false);
  };

  const handleRemoveItem = async (index: number) => {
    const item = items[index];
    if (!savedWorkLog?.id || !item?.id) return;
    await onDeleteWorklogItem(savedWorkLog.id, item.id);
  };

  const totalHours = items.reduce((sum, item) => sum + item.hoursSpent, 0);

  return (
    <div
      className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex flex-col justify-between"
      id="erp-work-log-entry-panel"
    >
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-[#f4f1e8] rounded-xl text-[#5a6e53]">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-[#2d3a2a] font-serif text-base tracking-tight">
              Work log submissions
            </h3>
            <p className="text-xs text-[#7a7d75]">
              Each appended task saves directly to the database
            </p>
          </div>
        </div>

        {/* Today logged items */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-[#3d403a] block">
              Logged Tasks Today
            </span>
            <span className="text-xs font-mono font-bold text-[#5a6e53] bg-[#f4f1e8] border border-[#e2dfd2] px-2.5 py-0.5 rounded-lg">
              Total Hours: {totalHours}h
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#e2dfd2] rounded-xl bg-[#f4f1e8]/20">
              <p className="text-xs text-[#7a7d75]">
                No tasks logged today. Append entries below!
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="group relative flex items-start justify-between bg-[#f4f1e8]/30 py-2.5 px-3 border border-[#e2dfd2] rounded-xl hover:bg-[#f4f1e8]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-[#5a6e53] uppercase">
                        {it.project}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 font-bold font-mono rounded bg-[#e2dfd2] text-[#3d403a] scale-[0.95] inline-block uppercase">
                        {it.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">
                        {it.hoursSpent}h
                      </span>
                      {it.taskId && (
                        <span className="text-[9px] bg-emerald-50 text-[#5a6e53] font-bold font-mono px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                          🔗 Task ID: {it.taskId}
                        </span>
                      )}
                      {it.githubLink && (
                        <a
                          href={it.githubLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] bg-sky-50 text-sky-700 font-bold font-mono px-1.5 py-0.5 rounded border border-sky-200 hover:bg-sky-100 transition-colors"
                        >
                          GitHub Link
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] text-[#3d403a] line-clamp-2 md:line-clamp-none font-sans leading-relaxed">
                      {it.description}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleRemoveItem(idx)}
                    className="text-slate-300 hover:text-[#d4a373] p-1 rounded-md transition-colors self-center cursor-pointer disabled:opacity-30"
                    title="Delete from database"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Entry form */}
        <form
          onSubmit={handleAddItem}
          className="space-y-3 bg-[#f4f1e8]/25 p-4 border border-[#e2dfd2] rounded-2xl"
        >
          <div className="flex justify-between items-center pb-2 border-b border-[#e2dfd2]">
            <span className="text-xs font-semibold text-[#2d3a2a]">Add Task Entry</span>
            <span className="text-[10px] text-[#7a7d75] font-mono font-semibold">
              Saved to DB on append
            </span>
          </div>

          {/* Task association — always visible */}
          <div className="bg-[#5a6e53]/5 border border-[#5a6e53]/15 p-2 rounded-xl">
            <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
              Associate with Assigned Task (Required)
            </label>
            <input
              type="text"
              placeholder="Search by task ID, title, or project"
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2 py-1.5 focus:outline-none font-sans text-[#3d403a]"
              value={taskSearch}
              onFocus={() => setShowTaskResults(true)}
              onChange={(e) => {
                setTaskSearch(e.target.value);
                setAssociatedTaskId("");
                setShowTaskResults(true);
              }}
            />
            {showTaskResults && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-[#e2dfd2] bg-white">
                {taskSearchLoading ? (
                  <div className="px-2.5 py-2 text-[11px] text-[#7a7d75]">Loading tasks...</div>
                ) : taskSearchResults.length === 0 ? (
                  <div className="px-2.5 py-2 text-[11px] text-[#7a7d75]">No matching assigned task found.</div>
                ) : (
                  taskSearchResults.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className="w-full text-left px-2.5 py-2 border-b border-[#f1efe6] last:border-b-0 hover:bg-[#f4f1e8]/40"
                      onClick={() => {
                        setAssociatedTaskId(task.id);
                        setTaskSearch(`${task.id} - ${task.title}`);
                        setShowTaskResults(false);
                        if (task.projectName) {
                          setProject(task.projectName);
                        }
                      }}
                    >
                      <div className="text-[11px] font-mono text-[#5a6e53] font-bold">{task.id}</div>
                      <div className="text-[11px] text-[#3d403a]">{task.title}</div>
                    </button>
                  ))
                )}
              </div>
            )}
            <p className="mt-1 text-[10px] font-mono text-[#7a7d75]">
              Selected Task ID: {associatedTaskId || "none"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
                Project Name *
              </label>
              <select
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none font-sans text-[#3d403a]"
                value={project}
                onChange={(e) => setProject(e.target.value)}
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
                Category *
              </label>
              <select
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none font-sans text-[#3d403a]"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as LogItem["category"])
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
                Task description *
              </label>
              <input
                type="text"
                placeholder="Describe outcome..."
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none placeholder-slate-300 font-sans text-[#3d403a]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
                Hours *
              </label>
              <input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                required
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none placeholder-slate-300 font-mono text-[#3d403a] text-center"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
              GitHub Link (Optional)
            </label>
            <input
              type="url"
              placeholder="e.g., https://github.com/org/repo/pull/12"
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none placeholder-slate-300 font-sans text-[#3d403a]"
              value={githubLink}
              onChange={(e) => setGithubLink(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#5a6e53] uppercase block mb-1">
              Report / TL
            </label>
            <select
              className="w-full text-xs bg-white border border-[#e2dfd2] focus:border-[#5a6e53] rounded-xl px-2.5 py-1.5 focus:outline-none font-sans text-[#3d403a]"
              value={selectedTLId}
              onChange={(e) => setSelectedTLId(e.target.value)}
            >
              {teamLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name} ({lead.role})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
              disabled={loading || !associatedTaskId}
            className="w-full flex items-center justify-center gap-1.5 border border-[#e2dfd2] hover:bg-[#f4f1e8] bg-white rounded-xl py-2.5 px-3 text-[#3d403a] text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-3.5 w-3.5 text-[#5a6e53]"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving to database...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-[#5a6e53]" />
                Append to Log
                <Sparkles className="w-3 h-3 text-[#d4a373] ml-0.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
