export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
  punchStatus: 'Offline' | 'Active' | 'Break' | 'ClockedOut';
  lastPunchTime?: string;
  isTL: boolean;
  tlId?: string; // Reports to
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
}
