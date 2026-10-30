CREATE TABLE "horas_extra_dia" (
    "id" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "ordinarias" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "feriados" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "diurnas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nocturnas" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "diurnas_feriado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nocturnas_feriado" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horas_extra_dia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "horas_extra_dia_employeeId_date_key" ON "horas_extra_dia"("employeeId", "date");
CREATE INDEX "horas_extra_dia_year_month_idx" ON "horas_extra_dia"("year", "month");

ALTER TABLE "horas_extra_dia" ADD CONSTRAINT "horas_extra_dia_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
