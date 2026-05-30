import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both root and backend directory as fallback
dotenv.config();
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with custom User-Agent
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("GEMINI_API_KEY environment variable is not defined. AI summaries will be simulated.");
}

const DB_PATH = path.join(process.cwd(), "db.json");

// Default initial data for seeding
const DEFAULT_MEMBERS = [
  {
    id: "user-sagor",
    name: "Ikramul Haq Sagor",
    email: "ikramulhaqsagor@gmail.com",
    role: "Senior Full Stack Engineer",
    roleType: "Engineer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "Offline",
    isTL: false,
    tlId: "lead-sarah",
    agreementHours: 20,
    breakDay: "Friday"
  },
  {
    id: "lead-sarah",
    name: "Sarah Connor",
    email: "sarah.connor@monolith.io",
    role: "Engineering Team Lead",
    roleType: "Manager",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "Active",
    lastPunchTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), // 3.5 hours ago
    isTL: true,
    agreementHours: 40,
    breakDay: "Sunday"
  },
  {
    id: "user-alex",
    name: "Alex Rivera",
    email: "alex.rivera@monolith.io",
    role: "Lead UI/UX Designer",
    roleType: "Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    department: "Design",
    punchStatus: "Break",
    lastPunchTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isTL: false,
    tlId: "lead-sarah",
    agreementHours: 10,
    breakDay: "Monday"
  },
  {
    id: "user-maya",
    name: "Maya Peterson",
    email: "maya.p@monolith.io",
    role: "Principal Product Manager",
    roleType: "Manager",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    department: "Product",
    punchStatus: "Offline",
    isTL: true,
    agreementHours: 40,
    breakDay: "Saturday"
  },
  {
    id: "user-liam",
    name: "Liam Foster",
    email: "liam.f@monolith.io",
    role: "Senior Cloud & DevOps Architect",
    roleType: "Engineer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "ClockedOut",
    lastPunchTime: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    isTL: false,
    tlId: "lead-sarah",
    agreementHours: 20,
    breakDay: "Friday"
  }
];

const DEFAULT_PUNCHES = [
  {
    id: "p1",
    userId: "lead-sarah",
    date: new Date().toISOString().split("T")[0],
    clockIn: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
    type: "Punch",
    note: "Focusing on architecture refactoring"
  },
  {
    id: "p2",
    userId: "user-alex",
    date: new Date().toISOString().split("T")[0],
    clockIn: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    type: "Punch",
    note: "Syncing on typography guidelines"
  },
  {
    id: "p3",
    userId: "user-alex",
    date: new Date().toISOString().split("T")[0],
    clockIn: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    type: "BreakStart",
    note: "Coffee break"
  },
  {
    id: "p4",
    userId: "user-liam",
    date: new Date().toISOString().split("T")[0],
    clockIn: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    clockOut: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    type: "ClockOut",
    totalMinutes: 480,
    note: "Completed database migrations successfully"
  }
];

const DEFAULT_WORKLOGS = [
  {
    id: "wl1",
    userId: "user-liam",
    date: new Date().toISOString().split("T")[0],
    items: [
      {
        project: "Monolith Core",
        category: "Bugfix",
        description: "Diagnosed and patched high-severity routing loop in DB integration layers.",
        hoursSpent: 3.5
      },
      {
        project: "DevOps Infrastructure",
        category: "Support",
        description: "Assisted development teams with container deployments and pipeline setups.",
        hoursSpent: 4.5
      }
    ],
    emailDraft: "Hi Team,\n\nHere is my work summary for today:\n- Patched DB routing loops in standard layers (3.5 hours)\n- Optimized container image build caches (4.5 hours)\n\nRegards,\nLiam",
    emailSubject: "Daily Work Update - Liam Foster (2026-05-30)",
    aiSummarized: "Liam resolved DB routing errors and sped up deployment configurations.",
    sentToTl: true,
    assignedTL: { name: "Sarah Connor", email: "sarah.connor@monolith.io" },
    submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_TASKS = [
  {
    id: "t1",
    title: "Vite Configuration Cleanups",
    description: "Align dev server and bundling plugins to ensure standard code loading inside sandbox environments.",
    assignedTo: "user-sagor",
    assignedBy: "lead-sarah",
    status: "In Progress",
    priority: "High",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    projectName: "Swiss Design System",
    estimatedHours: 16,
    actualHours: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  },
  {
    id: "t2",
    title: "Typography & Theme Alignment",
    description: "Adopt Swiss/Modern guidelines across active team dashboards, respecting layout ratios.",
    assignedTo: "user-alex",
    assignedBy: "lead-sarah",
    status: "Pending",
    priority: "Medium",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    projectName: "Swiss Design System",
    estimatedHours: 8,
    actualHours: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  },
  {
    id: "t3",
    title: "Dev Server Port Mapping Audit",
    description: "Review node_modules environments to guarantee strict 3000 mapping internally.",
    assignedTo: "user-liam",
    assignedBy: "lead-sarah",
    status: "Completed",
    priority: "High",
    dueDate: new Date().toISOString().split("T")[0],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    projectName: "DevOps Infrastructure",
    estimatedHours: 12,
    actualHours: 4.5,
    startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0]
  }
];

const DEFAULT_PROJECTS = [
  { id: "p1", name: "Monolith Core", description: "Backend optimization layers & API platform", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
  { id: "p2", name: "DevOps Infrastructure", description: "Azure deployment cluster mapping and pipeline caching", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
  { id: "p3", name: "Swiss Design System", description: "Elegant layout, high contrast dashboard components", createdAt: new Date().toISOString(), createdBy: "lead-sarah" }
];

// Hash password with pbkdf2
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

// Verify password
function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const currentHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return currentHash === hash;
}

// Helper to initialize and read write db file
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initializedMembers = DEFAULT_MEMBERS.map((member: any) => {
      return {
        ...member,
        passwordHash: hashPassword("password123")
      };
    });
    const initialState = {
      members: initializedMembers,
      punches: DEFAULT_PUNCHES,
      worklogs: DEFAULT_WORKLOGS,
      tasks: DEFAULT_TASKS,
      projects: DEFAULT_PROJECTS,
      sentEmailsLog: [] as any[],
      messages: [] as any[]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    let dirty = false;
    
    // Ensure lists exist
    if (!db.messages) {
      db.messages = [];
      dirty = true;
    }
    if (!db.sentEmailsLog) {
      db.sentEmailsLog = [];
      dirty = true;
    }
    if (!db.members) {
      db.members = DEFAULT_MEMBERS;
      dirty = true;
    }
    if (!db.projects) {
      db.projects = DEFAULT_PROJECTS;
      dirty = true;
    }
    if (!db.tasks) {
      db.tasks = DEFAULT_TASKS;
      dirty = true;
    }
    
    // Migrations on old tasks
    db.tasks = db.tasks.map((task: any) => {
      let changed = false;
      if (!task.projectName) {
        task.projectName = "Monolith Core";
        changed = true;
      }
      if (task.estimatedHours === undefined) {
        task.estimatedHours = 12;
        changed = true;
      }
      if (task.actualHours === undefined) {
        task.actualHours = 0;
        changed = true;
      }
      if (!task.startDate) {
        task.startDate = (task.createdAt || new Date().toISOString()).split("T")[0];
        changed = true;
      }
      if (!task.endDate) {
        task.endDate = task.dueDate || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        changed = true;
      }
      if (!task.comments) {
        task.comments = [];
        changed = true;
      }
      if (!task.history || task.history.length === 0) {
        task.history = [
          {
            id: "h_mig_" + Math.random().toString(36).substr(2, 9),
            actorId: task.assignedBy || "system",
            actorName: "System",
            type: "creation",
            detail: "Task initialized and scheduled",
            timestamp: task.createdAt || new Date().toISOString()
          }
        ];
        changed = true;
      }
      if (!task.subtasks) {
        task.subtasks = [];
        changed = true;
      }
      if (changed) {
        dirty = true;
      }
      return task;
    });

    // Auto-migrate standard roster files to guarantee customizable properties
    db.members = db.members.map((member: any) => {
      let changed = false;
      if (!member.roleType) {
        member.roleType = (member.id === "lead-sarah" || member.id === "user-maya") ? "Manager" : "Engineer";
        changed = true;
      }
      if (member.agreementHours === undefined) {
        member.agreementHours = member.roleType === "Manager" ? 40 : 20;
        changed = true;
      }
      if (!member.breakDay) {
        member.breakDay = member.id === "user-alex" ? "Monday" : "Friday";
        changed = true;
      }
      if (!member.passwordHash) {
        member.passwordHash = hashPassword("password123");
        changed = true;
      }
      if (changed) {
        dirty = true;
      }
      return member;
    });

    if (dirty) {
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    }
    
    return db;
  } catch (err) {
    console.error("Error reading database", err);
    return {
      members: DEFAULT_MEMBERS,
      punches: DEFAULT_PUNCHES,
      worklogs: DEFAULT_WORKLOGS,
      tasks: DEFAULT_TASKS,
      projects: DEFAULT_PROJECTS,
      sentEmailsLog: [],
      messages: []
    };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database", err);
  }
}

// REST API Endpoints

// 1. Get entire ERP current state
app.get("/api/erp/state", (req, res) => {
  const db = readDB();
  res.json(db);
});

// 2. Punch in / out / break actions
app.post("/api/erp/punch", (req, res) => {
  const { userId, type, note } = req.body;
  if (!userId || !type) {
    return res.status(400).json({ error: "Missing required params: userId, type" });
  }

  const db = readDB();
  const member = db.members.find((m: any) => m.id === userId);
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const now = new Date();

  // Create a record
  const recordId = "p_" + Math.random().toString(36).substr(2, 9);
  const newRecord: any = {
    id: recordId,
    userId,
    date: todayStr,
    clockIn: now.toISOString(),
    type,
    note: note || ""
  };

  // Find previous action today to calculate length or transition
  const memberPunches = db.punches.filter((p: any) => p.userId === userId && p.date === todayStr);
  const lastActivePunch = [...memberPunches].reverse().find((p: any) => p.clockOut === undefined && p.type === "Punch");

  if (type === "ClockOut" || type === "BreakStart") {
    if (lastActivePunch) {
      // Close last active punch
      lastActivePunch.clockOut = now.toISOString();
      const diffMs = now.getTime() - new Date(lastActivePunch.clockIn).getTime();
      lastActivePunch.totalMinutes = Math.round(diffMs / 60000);
    }
  }

  // Update member status
  if (type === "Punch") {
    member.punchStatus = "Active";
    member.lastPunchTime = now.toISOString();
  } else if (type === "BreakStart") {
    member.punchStatus = "Break";
    member.lastPunchTime = now.toISOString();
  } else if (type === "BreakEnd") {
    member.punchStatus = "Active";
    member.lastPunchTime = now.toISOString();
  } else if (type === "ClockOut") {
    member.punchStatus = "ClockedOut";
    member.lastPunchTime = now.toISOString();
  }

  db.punches.push(newRecord);
  writeDB(db);

  res.json({ success: true, state: db });
});

// 3. Save a daily work log, with optional AI draft generation
app.post("/api/erp/worklog", async (req, res) => {
  const { userId, items, assignedTL } = req.body;
  if (!userId || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Missing required fields: userId, items" });
  }

  const db = readDB();
  const member = db.members.find((m: any) => m.id === userId);
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Assemble text list for Gemini prompt
  const itemsText = items.map((it: any, index: number) => {
    return `${index + 1}. [Project: ${it.project}] (${it.category}) ${it.description} - spent ${it.hoursSpent} hours.`;
  }).join("\n");

  let emailDraft = "";
  let emailSubject = `Daily Work Report - ${member.name} (${todayStr})`;
  let aiSummarized = "";

  if (ai && items.length > 0) {
    try {
      const prompt = `
You are an advanced remote Team Lead assistant. Below is the raw daily activities log submitted by remote employee ${member.name} (${member.role}):

${itemsText}

Using these raw logs, please generate two things and format them in a tidy JSON block:
1. "summary": A brief 1-sentence professional summary summarizing what the engineer achieved today. Focus on outcomes.
2. "emailBody": A polite, incredibly professional, well-structured daily update email directed to their supervisor ${assignedTL ? assignedTL.name : "Team Lead"}. Include a pleasant opening, absolute exact breakdown of the tasks and hours in neat bullet points, and a friendly, respectful sign-off.

Format your response as a strict JSON block, with these exact keys:
{
  "summary": "their summary here",
  "emailBody": "professional email draft body here"
}
Ensure there is no extra fluff or markdown outside of the JSON block. Do NOT include json tags, just the raw JSON.
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "{}";
      const cleanedText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      
      try {
        const parsed = JSON.parse(cleanedText);
        aiSummarized = parsed.summary || "";
        emailDraft = parsed.emailBody || "";
      } catch (parseErr) {
        console.error("JSON parse failure for AI output:", responseText);
        // Fallback draft
        aiSummarized = `Completed engineering entries under projects: ${items.map((i: any) => i.project).join(", ")}.`;
        emailDraft = `Dear ${assignedTL ? assignedTL.name : "Team Lead"},\n\nHope this finds you well. Here is my daily remote activity log for today:\n\n${items.map(it => `- ${it.project} [${it.category}]: ${it.description} (${it.hoursSpent}h)`).join('\n')}\n\nThank you,\n${member.name}`;
      }
    } catch (aiErr) {
      console.error("Gemini invocation failed:", aiErr);
      // Fallback simple simulation
      aiSummarized = `Drafted updates for: ${items.map((i: any) => i.project).join(", ")}.`;
      emailDraft = `Hi ${assignedTL?.name || "TL"},\n\nHere is my work summary for today:\n\n${items.map(it => `- ${it.project} (${it.category}): ${it.description} (${it.hoursSpent}h)`).join('\n')}\n\nBest regards,\n${member.name}`;
    }
  } else {
    // Standard simulation if API not present
    aiSummarized = `Documented ${items.length} tasks across team logs.`;
    emailDraft = `Dear ${assignedTL?.name || "TL"},\n\nI have successfully completed my hours today. Raw tasks completed:\n\n${items.map(it => `- ${it.project} - ${it.description} (${it.hoursSpent} hrs)`).join('\n')}\n\nSincerely,\n${member.name}`;
  }

  const logId = "wl_" + Math.random().toString(36).substr(2, 9);
  const newWorkLog = {
    id: logId,
    userId,
    date: todayStr,
    items,
    emailDraft,
    emailSubject,
    aiSummarized,
    sentToTl: false,
    assignedTL: assignedTL || { name: "Sarah Connor", email: "sarah.connor@monolith.io" },
    submittedAt: new Date().toISOString()
  };

  // Recalculate and update database tasks actual hours spent
  function recalcActualHours(database: any) {
    database.tasks.forEach((t: any) => {
      t.actualHours = 0;
    });
    database.worklogs.forEach((wl: any) => {
      if (wl.items && Array.isArray(wl.items)) {
        wl.items.forEach((item: any) => {
          if (item.taskId) {
            const task = database.tasks.find((t: any) => t.id === item.taskId);
            if (task) {
              task.actualHours = (task.actualHours || 0) + Number(item.hoursSpent || 0);
            }
          }
        });
      }
    });
  }

  // Replace any existing work log for this user today, or push
  const existingLogIndex = db.worklogs.findIndex((wl: any) => wl.userId === userId && wl.date === todayStr);
  if (existingLogIndex >= 0) {
    db.worklogs[existingLogIndex] = newWorkLog;
  } else {
    db.worklogs.push(newWorkLog);
  }

  recalcActualHours(db);
  writeDB(db);
  res.json({ success: true, worklog: newWorkLog, state: db });
});

// 3a. Create new project portfolio
app.post("/api/erp/project", (req, res) => {
  const { name, description, createdBy } = req.body;
  if (!name || !createdBy) {
    return res.status(400).json({ error: "Missing required core project fields: name, createdBy" });
  }

  const db = readDB();
  const exists = db.projects.some((p: any) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: "A project with this name already exists in the system." });
  }

  const newProj = {
    id: "p_" + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    description: description || "",
    createdAt: new Date().toISOString(),
    createdBy
  };

  db.projects.push(newProj);
  writeDB(db);

  res.json({ success: true, project: newProj, state: db });
});

// 4. Distribute a task to a remote member (Manager or Engineer self-assigned)
app.post("/api/erp/task", (req, res) => {
  const { title, description, assignedTo, assignedBy, priority, dueDate, projectName, estimatedHours, startDate, endDate } = req.body;
  if (!title || !assignedTo || !assignedBy) {
    return res.status(400).json({ error: "Missing task distribution properties" });
  }

  const db = readDB();
  const taskId = "t_" + Math.random().toString(36).substr(2, 9);
  
  const defaultStart = new Date().toISOString().split("T")[0];
  const defaultEnd = dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const creator = db.members.find((m: any) => m.id === assignedBy) || { name: "System" };

  const newTask = {
    id: taskId,
    title,
    description: description || "",
    assignedTo,
    assignedBy,
    status: "Pending",
    priority: priority || "Medium",
    dueDate: endDate || defaultEnd,
    createdAt: new Date().toISOString(),
    projectName: projectName || "Monolith Core",
    estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : 10,
    actualHours: 0,
    startDate: startDate || defaultStart,
    endDate: endDate || defaultEnd,
    comments: [] as any[],
    history: [
      {
        id: "h_" + Math.random().toString(36).substr(2, 9),
        actorId: assignedBy,
        actorName: creator.name,
        type: "creation",
        detail: `Task assigned and scheduled under ${projectName || "Monolith Core"}`,
        timestamp: new Date().toISOString()
      }
    ] as any[],
    subtasks: [] as any[]
  };

  db.tasks.push(newTask);
  writeDB(db);

  res.json({ success: true, task: newTask, state: db });
});

// 5. Update distributed task status and details
app.post("/api/erp/task/update", (req, res) => {
  const { taskId, status, title, description, priority, estimatedHours, dueDate, startDate, endDate, projectName, actorId } = req.body;
  if (!taskId) {
    return res.status(400).json({ error: "Missing taskId" });
  }

  const db = readDB();
  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.comments = task.comments || [];
  task.history = task.history || [];
  task.subtasks = task.subtasks || [];

  const actor = db.members.find((m: any) => m.id === actorId) || { name: "System" };

  if (status && task.status !== status) {
    task.history.push({
      id: "h_" + Math.random().toString(36).substr(2, 9),
      actorId: actorId || "system",
      actorName: actor.name,
      type: "status_change",
      detail: `Changed status from "${task.status}" to "${status}"`,
      timestamp: new Date().toISOString()
    });
    task.status = status;
  }

  if (title && task.title !== title) {
    task.history.push({
      id: "h_" + Math.random().toString(36).substr(2, 9),
      actorId: actorId || "system",
      actorName: actor.name,
      type: "edit",
      detail: `Renamed task to "${title}"`,
      timestamp: new Date().toISOString()
    });
    task.title = title;
  }

  if (description !== undefined && task.description !== description) {
    task.history.push({
      id: "h_" + Math.random().toString(36).substr(2, 9),
      actorId: actorId || "system",
      actorName: actor.name,
      type: "edit",
      detail: `Updated instructions description`,
      timestamp: new Date().toISOString()
    });
    task.description = description;
  }

  if (priority && task.priority !== priority) {
    task.history.push({
      id: "h_" + Math.random().toString(36).substr(2, 9),
      actorId: actorId || "system",
      actorName: actor.name,
      type: "edit",
      detail: `Updated priority from "${task.priority}" to "${priority}"`,
      timestamp: new Date().toISOString()
    });
    task.priority = priority;
  }

  if (estimatedHours !== undefined && Number(estimatedHours) !== task.estimatedHours) {
    task.history.push({
      id: "h_" + Math.random().toString(36).substr(2, 9),
      actorId: actorId || "system",
      actorName: actor.name,
      type: "edit",
      detail: `Modified allocated time to ${estimatedHours} hours`,
      timestamp: new Date().toISOString()
    });
    task.estimatedHours = Number(estimatedHours);
  }

  if (startDate && task.startDate !== startDate) {
    task.startDate = startDate;
  }

  if (endDate && task.endDate !== endDate) {
    task.endDate = endDate;
    task.dueDate = endDate;
  }

  if (projectName && task.projectName !== projectName) {
    task.projectName = projectName;
  }

  writeDB(db);
  res.json({ success: true, task, state: db });
});

// 5a. Comment on distributed task
app.post("/api/erp/task/comment", (req, res) => {
  const { taskId, authorId, text } = req.body;
  if (!taskId || !authorId || !text || !text.trim()) {
    return res.status(400).json({ error: "Missing taskId, authorId, or comment text" });
  }

  const db = readDB();
  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  const author = db.members.find((m: any) => m.id === authorId) || { name: "Guest Developer", avatar: "" };
  const commentId = "c_" + Math.random().toString(36).substr(2, 9);
  
  const newComment = {
    id: commentId,
    authorId,
    authorName: author.name,
    authorAvatar: author.avatar || "",
    text: text.trim(),
    createdAt: new Date().toISOString()
  };

  task.comments = task.comments || [];
  task.comments.push(newComment);

  task.history = task.history || [];
  task.history.push({
    id: "h_" + Math.random().toString(36).substr(2, 9),
    actorId: authorId,
    actorName: author.name,
    type: "comment",
    detail: `Added comment: "${text.trim().length > 30 ? text.trim().substring(0, 30) + "..." : text.trim()}"`,
    timestamp: new Date().toISOString()
  });

  writeDB(db);
  res.json({ success: true, task, state: db });
});

// 5b. Update subtask list of a distributed task
app.post("/api/erp/task/subtasks", (req, res) => {
  const { taskId, subtasks, actorId } = req.body;
  if (!taskId || !Array.isArray(subtasks)) {
    return res.status(400).json({ error: "Missing taskId or subtasks definition list" });
  }

  const db = readDB();
  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.subtasks = task.subtasks || [];
  task.history = task.history || [];

  const oldSubtasks = task.subtasks;
  const actor = db.members.find((m: any) => m.id === actorId) || { name: "System" };

  // Detect additions & state toggling
  subtasks.forEach((newSub: any) => {
    const oldSub = oldSubtasks.find((o: any) => o.id === newSub.id);
    if (oldSub) {
      if (oldSub.isCompleted !== newSub.isCompleted) {
        task.history.push({
          id: "h_" + Math.random().toString(36).substr(2, 9),
          actorId: actorId || "system",
          actorName: actor.name,
          type: "subtask_toggle",
          detail: `${newSub.isCompleted ? "Completed" : "Reopened"} subtask: "${newSub.title}"`,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      task.history.push({
        id: "h_" + Math.random().toString(36).substr(2, 9),
        actorId: actorId || "system",
        actorName: actor.name,
        type: "subtask_add",
        detail: `Added subtask item: "${newSub.title}"`,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detect deletions
  oldSubtasks.forEach((oldSub: any) => {
    const deleted = !subtasks.some((n: any) => n.id === oldSub.id);
    if (deleted) {
      task.history.push({
        id: "h_" + Math.random().toString(36).substr(2, 9),
        actorId: actorId || "system",
        actorName: actor.name,
        type: "subtask_delete",
        detail: `Removed subtask: "${oldSub.title}"`,
        timestamp: new Date().toISOString()
      });
    }
  });

  task.subtasks = subtasks;
  writeDB(db);

  res.json({ success: true, task, state: db });
});

// 6. Send the compiled email draft to the TL (simulated send & save log)
app.post("/api/erp/send-email", (req, res) => {
  const { worklogId, customBody, customSubject } = req.body;
  if (!worklogId) {
    return res.status(400).json({ error: "Missing worklogId" });
  }

  const db = readDB();
  const wl = db.worklogs.find((w: any) => w.id === worklogId);
  if (!wl) {
    return res.status(404).json({ error: "Work log not found" });
  }

  wl.sentToTl = true;
  if (customBody) wl.emailDraft = customBody;
  if (customSubject) wl.emailSubject = customSubject;

  // Log to email receipts
  const mailReceipt = {
    id: "m_" + Math.random().toString(36).substr(2, 9),
    worklogId,
    senderId: wl.userId,
    receiverName: wl.assignedTL.name,
    receiverEmail: wl.assignedTL.email,
    subject: wl.emailSubject,
    body: wl.emailDraft,
    timestamp: new Date().toISOString()
  };

  db.sentEmailsLog.push(mailReceipt);
  writeDB(db);

  res.json({ success: true, receipt: mailReceipt, state: db });
});

// 6a. Register new remote applicant as Engineer ('isTL: false' and 'roleType: "Engineer"')
app.post("/api/erp/register", (req, res) => {
  const { name, email, department, agreementHours, breakDay, role, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing required fields: name, email, password" });
  }

  const db = readDB();
  const emailLower = email.trim().toLowerCase();
  const existing = db.members.find((m: any) => m.email.toLowerCase() === emailLower);
  
  if (existing) {
    return res.status(400).json({ error: "An employee with this email address already exists." });
  }

  const newId = "user-" + Math.random().toString(36).substr(2, 9);
  
  // Hash the password securely securely using PBKDF2 function
  const passwordHash = hashPassword(password);
  
  const newMember = {
    id: newId,
    name: name.trim(),
    email: emailLower,
    role: role ? role.trim() : "Software Engineer",
    roleType: "Engineer", // MUST be registered as engineer first!
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
    department: department || "Engineering",
    punchStatus: "Offline",
    isTL: false,
    tlId: "lead-sarah",
    agreementHours: Number(agreementHours) || 20,
    breakDay: breakDay || "Friday",
    passwordHash
  };

  db.members.push(newMember);
  writeDB(db);

  const { passwordHash: _, ...memberWithoutHash } = newMember;
  res.json({ success: true, member: memberWithoutHash, state: db });
});

// 6a-1. Validate credentials and log in secure session
app.post("/api/erp/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing required fields: email, password" });
  }

  const db = readDB();
  const emailLower = email.trim().toLowerCase();
  const member = db.members.find((m: any) => m.email.toLowerCase() === emailLower);

  if (!member) {
    return res.status(401).json({ error: "User profile with this email address was not found." });
  }

  // Support password verification safely
  const isValid = verifyPassword(password, member.passwordHash || "");
  if (!isValid) {
    return res.status(401).json({ error: "Incorrect credentials. Please verify and try again." });
  }

  // Authentication successful! Return the full profile without hash field
  const { passwordHash, ...profileWithoutPassword } = member;
  res.json({ success: true, member: profileWithoutPassword });
});

// 6b. Directly promote/demote or update user roles ("from db we will change the role as manager")
app.post("/api/erp/update-role", (req, res) => {
  const { userId, roleType } = req.body;
  if (!userId || !roleType) {
    return res.status(400).json({ error: "Missing required parameters: userId, roleType" });
  }

  const db = readDB();
  const member = db.members.find((m: any) => m.id === userId);
  
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }

  member.roleType = roleType; // Promote or demote
  if (roleType === "Manager") {
    member.role = "Team Manager";
    member.isTL = true; // Managers get allocation privileges too
  } else {
    member.role = "Software Engineer";
    member.isTL = false;
  }

  writeDB(db);
  res.json({ success: true, member, state: db });
});

// 6c. Send a direct chat message between managers and engineers
app.post("/api/erp/message", (req, res) => {
  const { senderId, receiverId, text } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: "Missing senderId, receiverId or text" });
  }

  const db = readDB();
  if (!db.messages) {
    db.messages = [];
  }

  const sender = db.members.find((m: any) => m.id === senderId);
  if (!sender) {
    return res.status(404).json({ error: "Sender not found" });
  }

  const newMessage = {
    id: "msg_" + Math.random().toString(36).substr(2, 9),
    senderId,
    receiverId,
    senderName: sender.name,
    text: text.trim(),
    timestamp: new Date().toISOString()
  };

  db.messages.push(newMessage);
  writeDB(db);

  res.json({ success: true, message: newMessage, state: db });
});

// 7. Reset entire ERP database back to startup state (seed)
app.post("/api/erp/reset", (req, res) => {
  const initialState = {
    members: DEFAULT_MEMBERS,
    punches: DEFAULT_PUNCHES,
    worklogs: DEFAULT_WORKLOGS,
    tasks: DEFAULT_TASKS,
    projects: DEFAULT_PROJECTS,
    sentEmailsLog: [],
    messages: []
  };
  writeDB(initialState);
  res.json({ success: true, state: initialState });
});


// Express server bundling setup for Dev and Production

const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server running at http://localhost:${PORT}`);
  });
};

startServer();
