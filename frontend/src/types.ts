export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  roleType: 'Engineer' | 'Manager';
  avatar: string;
  department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
  punchStatus: 'Offline' | 'Active' | 'Break' | 'ClockedOut';
  lastPunchTime?: string;
  isTL: boolean;
  tlId?: string; // Reports to
  agreementHours?: number; // e.g., 20 or 10
  breakDay?: string; // e.g., 'Monday' or 'Friday'
  passwordHash?: string;
}

export interface PunchRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn: string; // ISO string
  clockOut?: string; // ISO string
  type: 'Punch' | 'BreakStart' | 'BreakEnd' | 'ClockOut';
  totalMinutes?: number;
  note?: string;
}

export interface LogItem {
  id?: string;
  project: string;
  category: 'Feature' | 'Bugfix' | 'Meeting' | 'Research' | 'Documentation' | 'Support';
  description: string;
  hoursSpent: number;
  githubLink?: string; // optional github link
  taskId?: string; // Links dynamic actual hour spend logs
}

export interface EnterpriseProject {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderAvatar?: string;
  receiverName?: string;
  receiverAvatar?: string;
  text: string;
  content?: string;
  timestamp: string;
}

export interface MessageContact {
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
}

export interface SentEmailLogEntry {
  id: string;
  senderId: string;
  subject: string;
  receiverName: string;
  receiverEmail: string;
  body: string;
  timestamp: string;
}

export interface SentEmailDayBucket {
  day: string;
  items: SentEmailLogEntry[];
}

export interface SentEmailLogPage {
  scope: string;
  dayBuckets: SentEmailDayBucket[];
  pagination: {
    dayPage: number;
    dayWindow: number;
    totalDays: number;
    totalDayPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface WorkLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  items: LogItem[];
  emailDraft?: string;
  emailSubject?: string;
  aiSummarized?: string;
  sentToTl: boolean;
  assignedTL: { name: string; email: string };
  submittedAt: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  createdAt: string;
}

export interface TaskHistoryEvent {
  id: string;
  actorId: string;
  actorName: string;
  type: string; // e.g. 'status_change', 'comment', 'subtask_toggle', 'creation', 'edit'
  detail: string;
  timestamp: string;
}

export interface TaskSubtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface TaskDistribution {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // TeamMember id
  assignedBy: string; // TeamMember id (TL)
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  createdAt: string;
  projectName?: string;
  estimatedHours?: number;   // Original assigned duration
  actualHours?: number;      // Total spent time accumulated from logs
  startDate?: string;        // Assigned work start date
  endDate?: string;          // Assigned work end date
  comments?: TaskComment[];
  history?: TaskHistoryEvent[];
  subtasks?: TaskSubtask[];
}

export interface TaskListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: string;
  includeCompleted?: boolean;
}

export interface TaskListResult {
  tasks: TaskDistribution[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── Attendance (computed by backend) ────────────────────────────────────────

export interface DayAttendanceRow {
  date: string;
  firstPunchIn: string | null;
  lastClockOut: string | null;
  workedMinutes: number;
  breakMinutes: number;
  isCapped: boolean;
  sessionCount: number;
}

export interface AttendanceDaySummary {
  date: string;
  workedMinutes: number;
  isClockedOut: boolean;
}

export interface SelfAttendance {
  todayWorkedMinutes: number;
  isClockedOut: boolean;
  last7Days: AttendanceDaySummary[];
}

export interface EngineerAttendanceStat {
  memberId: string;
  todayWorkedMinutes: number;
  isClockedOut: boolean;
  last7Days: AttendanceDaySummary[];
  completedTasks: number;
}

export interface AttendanceData {
  self: SelfAttendance;
  monthRows: DayAttendanceRow[];
  monthMemberId: string;
  engineerStats?: EngineerAttendanceStat[];
}

