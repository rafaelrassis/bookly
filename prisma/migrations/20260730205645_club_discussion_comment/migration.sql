-- CreateTable
CREATE TABLE "ClubDiscussionComment" (
    "id" TEXT NOT NULL,
    "clubBookOfMonthId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubDiscussionComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClubDiscussionComment_clubBookOfMonthId_page_idx" ON "ClubDiscussionComment"("clubBookOfMonthId", "page");

-- AddForeignKey
ALTER TABLE "ClubDiscussionComment" ADD CONSTRAINT "ClubDiscussionComment_clubBookOfMonthId_fkey" FOREIGN KEY ("clubBookOfMonthId") REFERENCES "ClubBookOfMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDiscussionComment" ADD CONSTRAINT "ClubDiscussionComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
