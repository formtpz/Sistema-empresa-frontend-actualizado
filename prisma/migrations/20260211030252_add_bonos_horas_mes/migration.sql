/*
  Warnings:

  - A unique constraint covering the columns `[cedula]` on the table `employees` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "horas_extra_mes" (
    "id" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ordinarias" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feriados" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "diurnas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nocturnas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "diurnas_feriado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nocturnas_feriado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horas_extra_mes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonos_mes" (
    "id" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "bono_fijo" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "supervision" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "calidad_sup" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "supervision_sig" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "calidad_sig" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bonos_mes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "horas_extra_mes_year_month_idx" ON "horas_extra_mes"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "horas_extra_mes_employeeId_year_month_key" ON "horas_extra_mes"("employeeId", "year", "month");

-- CreateIndex
CREATE INDEX "bonos_mes_year_month_idx" ON "bonos_mes"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "bonos_mes_employeeId_year_month_key" ON "bonos_mes"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "employees_cedula_key" ON "employees"("cedula");

-- AddForeignKey
ALTER TABLE "horas_extra_mes" ADD CONSTRAINT "horas_extra_mes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonos_mes" ADD CONSTRAINT "bonos_mes_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
