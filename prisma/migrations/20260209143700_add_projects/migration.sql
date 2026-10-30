-- CreateEnum
CREATE TYPE "ProjectCode" AS ENUM ('COLOMBIA', 'PERU', 'ITALIA', 'GENERAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GERENCIA';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "projectId" INTEGER;

-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "code" "ProjectCode" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
