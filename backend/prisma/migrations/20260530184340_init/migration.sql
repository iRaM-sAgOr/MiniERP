-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleType" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "punchStatus" TEXT NOT NULL,
    "lastPunchTime" TEXT,
    "isTL" BOOLEAN NOT NULL,
    "tlId" TEXT,
    "agreementHours" INTEGER,
    "breakDay" TEXT,
    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable (must come before WorkLogItem, Subtask, Comment, HistoryEvent)
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Punch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "clockIn" TEXT NOT NULL,
    "clockOut" TEXT,
    "type" TEXT NOT NULL,
    "totalMinutes" INTEGER,
    "note" TEXT,
    CONSTRAINT "Punch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "emailDraft" TEXT,
    "emailSubject" TEXT,
    "aiSummarized" TEXT,
    "sentToTl" BOOLEAN NOT NULL,
    "tlName" TEXT,
    "tlEmail" TEXT,
    "submittedAt" TEXT NOT NULL,
    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogItem" (
    "id" TEXT NOT NULL,
    "workLogId" TEXT NOT NULL,
    "project" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hoursSpent" DOUBLE PRECISION NOT NULL,
    "taskId" TEXT,
    CONSTRAINT "WorkLogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subtask" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL,
    CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatar" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoryEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "HistoryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderAvatar" TEXT NOT NULL,
    "content" TEXT,
    "text" TEXT,
    "channel" TEXT,
    "receiverId" TEXT,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentEmailLog" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "receiverName" TEXT NOT NULL,
    "receiverEmail" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "SentEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Punch" ADD CONSTRAINT "Punch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLog" ADD CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogItem" ADD CONSTRAINT "WorkLogItem_workLogId_fkey" FOREIGN KEY ("workLogId") REFERENCES "WorkLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogItem" ADD CONSTRAINT "WorkLogItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryEvent" ADD CONSTRAINT "HistoryEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
