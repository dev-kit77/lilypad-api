-- CreateTable
CREATE TABLE "User" (
    "CUID" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("CUID")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userID" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userID" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 0,
    "privilege" BOOLEAN NOT NULL DEFAULT false,
    "dark" BOOLEAN NOT NULL DEFAULT false,
    "anon" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Post" (
    "CUID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replyingToID" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("CUID")
);

-- CreateTable
CREATE TABLE "Report" (
    "CUID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "action" TEXT,
    "reportedUserID" TEXT,
    "reportedPostID" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("CUID")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_token_key" ON "User"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_hash_key" ON "User"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userID_key" ON "UserProfile"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userID_key" ON "UserSettings"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "Post_userID_key" ON "Post"("userID");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("CUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("CUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("CUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_replyingToID_fkey" FOREIGN KEY ("replyingToID") REFERENCES "Post"("CUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("CUID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedUserID_fkey" FOREIGN KEY ("reportedUserID") REFERENCES "User"("CUID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedPostID_fkey" FOREIGN KEY ("reportedPostID") REFERENCES "Post"("CUID") ON DELETE SET NULL ON UPDATE CASCADE;
