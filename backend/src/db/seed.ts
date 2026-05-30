import { prisma } from "../config/prisma.js";
import bcryptjs from "bcryptjs";

async function runSeed() {
  console.log("Starting Database Seeding...");

  // 1. Clear Data in reverse relation order
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

  console.log("Temporary database tables cleared.");

  // Hash Password
  const testPasswordHash = bcryptjs.hashSync("password123", 10);

  // 2. Seed Members
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

  console.log("Seeded database members successfully.");

  // 3. Seed Projects
  await prisma.project.createMany({
    data: [
      { id: "p1", name: "Monolith Core", description: "Backend optimization layers & API platform", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
      { id: "p2", name: "DevOps Infrastructure", description: "Azure deployment cluster mapping and pipeline caching", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
      { id: "p3", name: "Swiss Design System", description: "Elegant layout, high contrast dashboard components", createdAt: new Date().toISOString(), createdBy: "lead-sarah" },
    ],
  });

  console.log("Seeded default projects successfully.");

  // 4. Seed Punches
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

  // 5. Seed WorkLogs and WorkLogItems
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

  // 6. Seed Tasks, Comments, History, Subtasks
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

  // Seed Subtasks for task t1
  await prisma.subtask.createMany({
    data: [
      { id: "sub-1-1", taskId: "t1", title: "Audit Vite config plugins list", isCompleted: true },
      { id: "sub-1-2", taskId: "t1", title: "Set server port to bind 3000 explicitly", isCompleted: false },
      { id: "sub-1-3", taskId: "t1", title: "Test hot reload status metrics", isCompleted: false },
    ],
  });

  // Seed Comments for task t1
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

  // 7. Seed General Messages
  await prisma.message.createMany({
    data: [
      {
        id: "m1",
        senderId: "lead-sarah",
        senderName: "Sarah Connor",
        senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
        content: "Hello team! Welcome to the brand-new, ultra-clean relational SQLite ERP workspace. All core logic has been refactored using Prisma and standard layered architecture repositories. Let's build amazing things together! 🚀",
        channel: "general",
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
  });

  console.log("Database successfully populated with clean seed data!");
}

runSeed()
  .catch((err) => {
    console.error("Critical error inside Database Seeder script", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Prisma Client connection closed.");
  });
