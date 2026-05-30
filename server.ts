import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "Offline",
    isTL: false,
    tlId: "lead-sarah"
  },
  {
    id: "lead-sarah",
    name: "Sarah Connor",
    email: "sarah.connor@monolith.io",
    role: "Engineering Team Lead",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "Active",
    lastPunchTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), // 3.5 hours ago
    isTL: true
  },
  {
    id: "user-alex",
    name: "Alex Rivera",
    email: "alex.rivera@monolith.io",
    role: "Lead UI/UX Designer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    department: "Design",
    punchStatus: "Break",
    lastPunchTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isTL: false,
    tlId: "lead-sarah"
  },
  {
    id: "user-maya",
    name: "Maya Peterson",
    email: "maya.p@monolith.io",
    role: "Principal Product Manager",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
    department: "Product",
    punchStatus: "Offline",
    isTL: true
  },
  {
    id: "user-liam",
    name: "Liam Foster",
    email: "liam.f@monolith.io",
    role: "Senior Cloud & DevOps Architect",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
    department: "Engineering",
    punchStatus: "ClockedOut",
    lastPunchTime: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    isTL: false,
    tlId: "lead-sarah"
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Helper to initialize and read write db file
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialState = {
      members: DEFAULT_MEMBERS,
      punches: DEFAULT_PUNCHES,
      worklogs: DEFAULT_WORKLOGS,
      tasks: DEFAULT_TASKS,
      sentEmailsLog: [] as any[]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database", err);
    return {
      members: DEFAULT_MEMBERS,
      punches: DEFAULT_PUNCHES,
      worklogs: DEFAULT_WORKLOGS,
      tasks: DEFAULT_TASKS,
      sentEmailsLog: []
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

  // Replace any existing work log for this user today, or push
  const existingLogIndex = db.worklogs.findIndex((wl: any) => wl.userId === userId && wl.date === todayStr);
  if (existingLogIndex >= 0) {
    db.worklogs[existingLogIndex] = newWorkLog;
  } else {
    db.worklogs.push(newWorkLog);
  }

  writeDB(db);
  res.json({ success: true, worklog: newWorkLog, state: db });
});

// 4. Distribute a task to a remote member
app.post("/api/erp/task", (req, res) => {
  const { title, description, assignedTo, assignedBy, priority, dueDate } = req.body;
  if (!title || !assignedTo || !assignedBy) {
    return res.status(400).json({ error: "Missing task distribution properties" });
  }

  const db = readDB();
  const taskId = "t_" + Math.random().toString(36).substr(2, 9);
  const newTask = {
    id: taskId,
    title,
    description: description || "",
    assignedTo,
    assignedBy,
    status: "Pending",
    priority: priority || "Medium",
    dueDate: dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    createdAt: new Date().toISOString()
  };

  db.tasks.push(newTask);
  writeDB(db);

  res.json({ success: true, task: newTask, state: db });
});

// 5. Update distributed task status
app.post("/api/erp/task/update", (req, res) => {
  const { taskId, status } = req.body;
  if (!taskId || !status) {
    return res.status(400).json({ error: "Missing taskId or status" });
  }

  const db = readDB();
  const task = db.tasks.find((t: any) => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }

  task.status = status;
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

// 7. Reset entire ERP database back to startup state (seed)
app.post("/api/erp/reset", (req, res) => {
  const initialState = {
    members: DEFAULT_MEMBERS,
    punches: DEFAULT_PUNCHES,
    worklogs: DEFAULT_WORKLOGS,
    tasks: DEFAULT_TASKS,
    sentEmailsLog: []
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
