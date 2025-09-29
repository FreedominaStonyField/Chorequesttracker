-- CreateTable
CREATE TABLE "AppState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "activeUser" TEXT,
    "cycleId" TEXT
);

-- CreateTable
CREATE TABLE "AdminSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "baseRewardPool" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "totalEarned" INTEGER NOT NULL,
    "totalCashedOut" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "ChoreTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minPercent" REAL NOT NULL,
    "maxPercent" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "CycleState" (
    "cycleId" TEXT NOT NULL PRIMARY KEY,
    "startDate" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "cycleLength" INTEGER NOT NULL,
    "rewardPool" INTEGER NOT NULL,
    "carryOverFromPreviousCycle" INTEGER NOT NULL,
    "dailyBudgets" JSONB NOT NULL,
    "configBaseRewardPool" INTEGER NOT NULL,
    "librarySignature" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "DailyChorePlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cycleId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "unallocated" INTEGER NOT NULL,
    CONSTRAINT "DailyChorePlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "CycleState" ("cycleId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestChore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "questId" TEXT NOT NULL,
    "reward" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL,
    "completedBy" TEXT,
    "completionTimestamp" TEXT,
    "templateId" TEXT NOT NULL,
    "templateTitle" TEXT NOT NULL,
    "templateDescription" TEXT NOT NULL,
    "templateMinPercent" REAL NOT NULL,
    "templateMaxPercent" REAL NOT NULL,
    CONSTRAINT "QuestChore_planId_fkey" FOREIGN KEY ("planId") REFERENCES "DailyChorePlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
