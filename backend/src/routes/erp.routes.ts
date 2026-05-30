import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { MemberService } from "../services/member.service.js";
import { PunchService } from "../services/punch.service.js";
import { WorkLogService } from "../services/worklog.service.js";
import { TaskService } from "../services/task.service.js";
import { ProjectService } from "../services/project.service.js";
import { MessageService } from "../services/message.service.js";
import { emitDirectMessage } from "../realtime/chat.gateway.js";
import bcryptjs from "bcryptjs";

const router = Router();

// Helper to fetch the complete application state, resolving field naming mismatches
async function getFullState() {
  const [members, punches, worklogs, tasks, messages, projects, sentEmailsLog] = await Promise.all([
    prisma.member.findMany(),
    prisma.punch.findMany(),
    prisma.workLog.findMany({
      include: {
        logItems: true
      }
    }),
    prisma.task.findMany({
      include: {
        comments: true,
        history: true,
        subtasks: true
      }
    }),
    prisma.message.findMany({
      orderBy: { timestamp: "asc" }
    }),
    prisma.project.findMany(),
    prisma.sentEmailLog.findMany({
      orderBy: { timestamp: "desc" }
    })
  ]);

  const mappedWorklogs = worklogs.map(wl => ({
    ...wl,
    items: wl.logItems,
    assignedTL: { name: wl.tlName || "", email: wl.tlEmail || "" }
  }));

  const mappedMessages = messages.map(msg => ({
    ...msg,
    text: msg.text || msg.content || "",
    content: msg.content || msg.text || ""
  }));

  return {
    members,
    punches,
    worklogs: mappedWorklogs,
    tasks,
    messages: mappedMessages,
    projects,
    sentEmailsLog
  };
}

// 1. Get State
router.get("/erp/state", async (req, res) => {
  try {
    const state = await getFullState();
    res.json(state);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Login
router.post("/erp/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const member = await MemberService.authenticate(email, password);
    res.json({ member });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// 3. Register
router.post("/erp/register", async (req, res) => {
  try {
    const userData = req.body;
    const member = await MemberService.registerMember(userData);
    const state = await getFullState();
    res.json({ member, state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Punch
router.post("/erp/punch", async (req, res) => {
  try {
    const { userId, type, note } = req.body;
    await PunchService.performPunch(userId, type, note || "");
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 5. Work Log
router.post("/erp/worklog", async (req, res) => {
  try {
    const { userId, items, assignedTL } = req.body;
    await WorkLogService.createOrReplaceWorkLog(userId, items, assignedTL);
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 6. Send Email
router.post("/erp/send-email", async (req, res) => {
  try {
    const { worklogId, customSubject, customBody } = req.body;
    const worklog = await prisma.workLog.findUnique({ where: { id: worklogId } });
    if (!worklog) {
      return res.status(404).json({ error: "Work log not found." });
    }

    await prisma.workLog.update({
      where: { id: worklogId },
      data: {
        sentToTl: true,
        emailSubject: customSubject,
        emailDraft: customBody
      }
    });

    await prisma.sentEmailLog.create({
      data: {
        id: "email_" + Math.random().toString(36).substr(2, 9),
        senderId: worklog.userId,
        subject: customSubject,
        receiverName: worklog.tlName || "Sarah Connor",
        receiverEmail: worklog.tlEmail || "sarah.connor@monolith.io",
        body: customBody,
        timestamp: new Date().toISOString()
      }
    });

    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 7. Create Task
router.post("/erp/task", async (req, res) => {
  try {
    const taskData = req.body;
    await TaskService.createTask(taskData);
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 8. Update Task (Handles status updates and generic task edits)
router.post("/erp/task/update", async (req, res) => {
  try {
    const { taskId, actorId, status, ...details } = req.body;
    const actor = await prisma.member.findUnique({ where: { id: actorId } });
    const actorName = actor ? actor.name : "System";

    if (status !== undefined && Object.keys(details).length === 0) {
      await TaskService.updateStatus(taskId, actorId, actorName, status);
    } else {
      const updatePayload = { ...details };
      if (status !== undefined) {
        updatePayload.status = status;
      }
      await TaskService.updateTaskDetails(taskId, actorId, actorName, updatePayload);
    }

    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 9. Add Task Comment
router.post("/erp/task/comment", async (req, res) => {
  try {
    const { taskId, authorId, text } = req.body;
    const author = await prisma.member.findUnique({ where: { id: authorId } });
    const authorName = author ? author.name : "Anonymous";
    const authorAvatar = author ? author.avatar : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200";
    
    await TaskService.addComment(taskId, authorId, authorName, authorAvatar, text);
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 10. Update Task Subtasks
router.post("/erp/task/subtasks", async (req, res) => {
  try {
    const { taskId, subtasks, actorId } = req.body;
    const actor = await prisma.member.findUnique({ where: { id: actorId } });
    const actorName = actor ? actor.name : "System";
    
    await TaskService.updateSubtasks(taskId, actorId, actorName, subtasks);
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 11. Create Project
router.post("/erp/project", async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    await ProjectService.createProject(name, description, createdBy);
    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 12. Update Role
router.post("/erp/update-role", async (req, res) => {
  try {
    const { userId, roleType } = req.body;
    const member = await MemberService.updateRoleType(userId, roleType);
    const state = await getFullState();
    res.json({ member, state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 13. Direct Chat Messaging
router.post("/erp/message", async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    const message = await MessageService.createDirectMessage(senderId, receiverId, text);
    emitDirectMessage(message);

    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 14. Reset Database Baseline
router.post("/erp/reset", async (req, res) => {
  try {
    // Clear All
    await prisma.message.deleteMany();
    await prisma.sentEmailLog.deleteMany();
    await prisma.subtask.deleteMany();
    await prisma.historyEvent.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.task.deleteMany();
    await prisma.workLogItem.deleteMany();
    await prisma.workLog.deleteMany();
    await prisma.punch.deleteMany();
    await prisma.project.deleteMany();
    await prisma.member.deleteMany();

    const testPasswordHash = bcryptjs.hashSync("password123", 10);

    // Seed Members
    const sagor = await prisma.member.create({
      data: {
        id: "user-sagor",
        name: "Ikramul Haq Sagor",
        email: "ikramulhaqsagor@gmail.com",
        passwordHash: testPasswordHash,
        role: "Senior Full Stack Engineer",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "Offline",
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 20,
        breakDay: "Friday",
      },
    });

    const sarah = await prisma.member.create({
      data: {
        id: "lead-sarah",
        name: "Sarah Connor",
        email: "sarah.connor@monolith.io",
        passwordHash: testPasswordHash,
        role: "Engineering Team Lead",
        roleType: "Manager",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "Active",
        lastPunchTime: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
        isTL: true,
        tlId: null,
        agreementHours: 40,
        breakDay: "Sunday",
      },
    });

    const alex = await prisma.member.create({
      data: {
        id: "user-alex",
        name: "Alex Rivera",
        email: "alex.rivera@monolith.io",
        passwordHash: testPasswordHash,
        role: "Lead UI/UX Designer",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        department: "Design",
        punchStatus: "Break",
        lastPunchTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 10,
        breakDay: "Monday",
      },
    });

    const maya = await prisma.member.create({
      data: {
        id: "user-maya",
        name: "Maya Peterson",
        email: "maya.p@monolith.io",
        passwordHash: testPasswordHash,
        role: "Principal Product Manager",
        roleType: "Manager",
        avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200",
        department: "Product",
        punchStatus: "Offline",
        isTL: true,
        tlId: null,
        agreementHours: 40,
        breakDay: "Saturday",
      },
    });

    const liam = await prisma.member.create({
      data: {
        id: "user-liam",
        name: "Liam Foster",
        email: "liam.f@monolith.io",
        passwordHash: testPasswordHash,
        role: "Senior Cloud & DevOps Architect",
        roleType: "Engineer",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
        department: "Engineering",
        punchStatus: "ClockedOut",
        lastPunchTime: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        isTL: false,
        tlId: "lead-sarah",
        agreementHours: 20,
        breakDay: "Friday",
      },
    });

    // Seed Projects
    await prisma.project.createMany({
      data: [
        { id: "p1", name: "Monolith Core", description: "Backend optimization layers & API platform", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
        { id: "p2", name: "DevOps Infrastructure", description: "Azure deployment cluster mapping and pipeline caching", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
        { id: "p3", name: "Swiss Design System", description: "Elegant layout, high contrast dashboard components", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
      ],
    });

    // Seed Punches
    await prisma.punch.createMany({
      data: [
        {
          id: "p1",
          userId: "lead-sarah",
          date: new Date().toISOString().split("T")[0],
          clockIn: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
          clockOut: null,
          type: "Punch",
          note: "Focusing on architecture refactoring",
        },
        {
          id: "p2",
          userId: "user-alex",
          date: new Date().toISOString().split("T")[0],
          clockIn: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          clockOut: null,
          type: "Punch",
          note: "Syncing on typography guidelines",
        },
        {
          id: "p3",
          userId: "user-alex",
          date: new Date().toISOString().split("T")[0],
          clockIn: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          clockOut: null,
          type: "BreakStart",
          note: "Coffee break",
        },
        {
          id: "p4",
          userId: "user-liam",
          date: new Date().toISOString().split("T")[0],
          clockIn: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
          clockOut: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          type: "ClockOut",
          totalMinutes: 480,
          note: "Completed database migrations successfully",
        },
      ],
    });

    // Seed WorkLogs & WorkLogItems
    const worklog = await prisma.workLog.create({
      data: {
        id: "wl1",
        userId: "user-liam",
        date: new Date().toISOString().split("T")[0],
        emailDraft: "Hi Team,\n\nHere is my work summary for today:\n- Patched DB routing loops in standard layers (3.5 hours)\n- Optimized container image build caches (4.5 hours)\n\nRegards,\nLiam",
        emailSubject: "Daily Work Update - Liam Foster (2026-05-30)",
        aiSummarized: "Liam resolved DB routing errors and sped up deployment configurations.",
        sentToTl: true,
        tlName: "Sarah Connor",
        tlEmail: "sarah.connor@monolith.io",
        submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    });

    await prisma.workLogItem.createMany({
      data: [
        {
          id: "wli1",
          workLogId: "wl1",
          project: "Monolith Core",
          category: "Bugfix",
          description: "Diagnosed and patched high-severity routing loop in DB integration layers.",
          hoursSpent: 3.5,
        },
        {
          id: "wli2",
          workLogId: "wl1",
          project: "DevOps Infrastructure",
          category: "Support",
          description: "Assisted development teams with container deployments and pipeline setups.",
          hoursSpent: 4.5,
        },
      ],
    });

    // Seed Tasks
    const t1 = await prisma.task.create({
      data: {
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
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    });

    const t2 = await prisma.task.create({
      data: {
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
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      },
    });

    const t3 = await prisma.task.create({
      data: {
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
        endDate: new Date().toISOString().split("T")[0],
      },
    });

    // Seed Subtasks
    await prisma.subtask.createMany({
      data: [
        { id: "sub-1-1", taskId: "t1", title: "Audit Vite config plugins list", isCompleted: true },
        { id: "sub-1-2", taskId: "t1", title: "Set server port to bind 3000 explicitly", isCompleted: false },
        { id: "sub-1-3", taskId: "t1", title: "Test hot reload status metrics", isCompleted: false },
      ],
    });

    // Seed Comments
    await prisma.comment.createMany({
      data: [
        {
          id: "com-1-1",
          taskId: "t1",
          authorId: "lead-sarah",
          authorName: "Sarah Connor",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
          text: "Please double check the reverse proxy settings. Clean code here is critical.",
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "com-1-2",
          taskId: "t1",
          authorId: "user-sagor",
          authorName: "Ikramul Haq Sagor",
          authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
          text: "Understood. Re-structuring into a layered Prisma setup now. We will follow strict *KISS* principles.",
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });

    // Seed History
    await prisma.historyEvent.createMany({
      data: [
        {
          id: "hist-1-1",
          taskId: "t1",
          actorId: "lead-sarah",
          actorName: "Sarah Connor",
          type: "creation",
          detail: "Task assigned and scheduled under Swiss Design System",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "hist-1-2",
          taskId: "t1",
          actorId: "user-sagor",
          actorName: "Ikramul Haq Sagor",
          type: "status_change",
          detail: 'Changed status from "Pending" to "In Progress"',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
      ],
    });

    // Seed Messages
    await prisma.message.create({
      data: {
        id: "m1",
        senderId: "lead-sarah",
        senderName: "Sarah Connor",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        content: "Hello team! Welcome to the brand-new, ultra-clean relational SQLite ERP workspace. All core logic has been refactored using Prisma and standard layered architecture repositories. Let's build amazing things together! 🚀",
        text: "Hello team! Welcome to the brand-new, ultra-clean relational SQLite ERP workspace. All core logic has been refactored using Prisma and standard layered architecture repositories. Let's build amazing things together! 🚀",
        channel: "general",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    });

    const state = await getFullState();
    res.json({ state });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
