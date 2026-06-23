-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "receiverAvatar" TEXT,
ADD COLUMN     "receiverName" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "githubRepoUrl" TEXT,
ADD COLUMN     "milestonePlan" TEXT,
ADD COLUMN     "notionUrl" TEXT,
ADD COLUMN     "releasePlanUrl" TEXT,
ADD COLUMN     "standardChecklist" TEXT,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "updatedAt" TEXT;

-- AlterTable
ALTER TABLE "WorkLogItem" ADD COLUMN     "githubLink" TEXT;

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
