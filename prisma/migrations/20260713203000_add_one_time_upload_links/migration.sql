CREATE TABLE "upload_links" (
    "id" TEXT NOT NULL,
    "uploadedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "upload_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upload_links_uploadedProjectId_key" ON "upload_links"("uploadedProjectId");

ALTER TABLE "upload_links" ADD CONSTRAINT "upload_links_uploadedProjectId_fkey" FOREIGN KEY ("uploadedProjectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
