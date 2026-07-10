CREATE TABLE IF NOT EXISTS "clients" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "contact" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "project_clients" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'requester',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_clients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "clients_email_idx" ON "clients"("email");
CREATE INDEX IF NOT EXISTS "project_clients_clientId_idx" ON "project_clients"("clientId");
CREATE UNIQUE INDEX IF NOT EXISTS "project_clients_projectId_clientId_role_key" ON "project_clients"("projectId", "clientId", "role");

ALTER TABLE "project_clients"
  ADD CONSTRAINT "project_clients_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_clients"
  ADD CONSTRAINT "project_clients_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
