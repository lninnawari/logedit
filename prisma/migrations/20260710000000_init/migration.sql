-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'editing',
    "originalHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_blocks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "speakerName" TEXT,
    "rawHtml" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "blockType" TEXT NOT NULL DEFAULT 'dialogue',
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_settings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "removeHtmlTags" BOOLEAN NOT NULL DEFAULT true,
    "removeHiddenMessage" BOOLEAN NOT NULL DEFAULT true,
    "normalizeEllipsis" BOOLEAN NOT NULL DEFAULT true,
    "normalizeQuotes" BOOLEAN NOT NULL DEFAULT true,
    "speakerTabFormat" BOOLEAN NOT NULL DEFAULT true,
    "cleanBlankLines" BOOLEAN NOT NULL DEFAULT true,
    "markHandoutPosition" BOOLEAN NOT NULL DEFAULT true,
    "customQuoteOpen" TEXT NOT NULL DEFAULT '“',
    "customQuoteClose" TEXT NOT NULL DEFAULT '”',
    "customEllipsis" TEXT NOT NULL DEFAULT '…',

    CONSTRAINT "correction_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_clients" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "project_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "message_blocks_projectId_orderIndex_idx" ON "message_blocks"("projectId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_projectId_key" ON "share_links"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "correction_settings_projectId_key" ON "correction_settings"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_clients_projectId_clientId_key" ON "project_clients"("projectId", "clientId");

-- AddForeignKey
ALTER TABLE "message_blocks" ADD CONSTRAINT "message_blocks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_settings" ADD CONSTRAINT "correction_settings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
