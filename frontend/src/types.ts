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
  text: string;
  timestamp: string;
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
}
