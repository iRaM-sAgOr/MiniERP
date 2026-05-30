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

  const testPasswordHash = bcryptjs.hashSync("password123", 10);

  // 2. Seed only two demo members: one Manager and one Engineer
  const manager = await prisma.member.create({
    data: {
      id: "demo-manager",
      name: "Manager Demo",
      email: "manager.demo@minierp.local",
      passwordHash: testPasswordHash,
      role: "Engineering Manager",
      roleType: "Manager",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
      department: "Engineering",
      punchStatus: "Active",
      lastPunchTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      isTL: true,
      tlId: null,
      agreementHours: 40,
      breakDay: "Sunday",
    },
  });

  const engineer = await prisma.member.create({
    data: {
      id: "demo-engineer",
      name: "Engineer Demo",
      email: "engineer.demo@minierp.local",
      passwordHash: testPasswordHash,
      role: "Software Engineer",
      roleType: "Engineer",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
      department: "Engineering",
      punchStatus: "Offline",
      isTL: false,
      tlId: manager.id,
      agreementHours: 20,
      breakDay: "Friday",
    },
  });

  console.log("Seeded database members successfully.");

  // 3. Seed Projects
  await prisma.project.create({
    data: {
      id: "demo-project-1",
      name: "Demo Delivery Project",
      description: "Starter project for demo manager and engineer.",
      createdAt: new Date().toISOString(),
      createdBy: manager.id,
    },
  });

  console.log("Seeded default projects successfully.");

  // 4. Seed Punches
  await prisma.punch.create({
    data: {
      id: "demo-punch-1",
      userId: engineer.id,
      date: new Date().toISOString().split("T")[0],
      clockIn: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      clockOut: null,
      type: "Punch",
      note: "Demo engineer started shift.",
    },
  });

  // 5. Seed WorkLogs and WorkLogItems
  await prisma.workLog.create({
    data: {
      id: "demo-worklog-1",
      userId: engineer.id,
      date: new Date().toISOString().split("T")[0],
      emailDraft: "Hi Team,\n\nDemo engineer completed initial setup and implementation updates.\n\nRegards,\nEngineer Demo",
      emailSubject: "Daily Work Update - Engineer Demo",
      aiSummarized: "Engineer Demo completed initial project setup tasks.",
      sentToTl: true,
      tlName: manager.name,
      tlEmail: manager.email,
      submittedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  });

  // 6. Seed Tasks, Comments, History, Subtasks
  const task = await prisma.task.create({
    data: {
      id: "demo-task-1",
      title: "Initial Demo Task",
      description: "Prepare baseline setup for demo environment.",
      assignedTo: engineer.id,
      assignedBy: manager.id,
      status: "In Progress",
      priority: "Medium",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
      projectName: "Demo Delivery Project",
      estimatedHours: 8,
      actualHours: 2,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    },
  });

  await prisma.workLogItem.create({
    data: {
      id: "demo-worklog-item-1",
      workLogId: "demo-worklog-1",
      project: "Demo Delivery Project",
      category: "Feature",
      description: "Implemented first-pass demo features and baseline wiring.",
      hoursSpent: 2,
      taskId: task.id,
    },
  });
  await prisma.subtask.createMany({
    data: [
      { id: "demo-subtask-1", taskId: task.id, title: "Prepare baseline setup", isCompleted: true },
      { id: "demo-subtask-2", taskId: task.id, title: "Verify login and task flow", isCompleted: false },
    ],
  });

  await prisma.comment.createMany({
    data: [
      {
        id: "demo-comment-1",
        taskId: task.id,
        authorId: manager.id,
        authorName: manager.name,
        authorAvatar: manager.avatar,
        text: "Please complete this starter task and update progress in the dashboard.",
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
    ],
  });

  await prisma.historyEvent.createMany({
    data: [
      {
        id: "demo-history-1",
        taskId: task.id,
        actorId: manager.id,
        actorName: manager.name,
        type: "creation",
        detail: "Task assigned to demo engineer",
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: "demo-history-2",
        taskId: task.id,
        actorId: engineer.id,
        actorName: engineer.name,
        type: "status_change",
        detail: 'Changed status from "Pending" to "In Progress"',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
  });

  // 7. Seed General Messages
  await prisma.message.createMany({
    data: [
      {
        id: "demo-message-1",
        senderId: manager.id,
        senderName: manager.name,
        senderAvatar: manager.avatar,
        content: "Welcome to the MiniERP demo workspace. Use your assigned account credentials to sign in.",
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
