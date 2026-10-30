-- AlterTable
ALTER TABLE "permisos" ADD COLUMN     "projectId" INTEGER;

-- CreateIndex
CREATE INDEX "permisos_projectId_idx" ON "permisos"("projectId");

-- AddForeignKey
ALTER TABLE "permisos" ADD CONSTRAINT "permisos_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
