-- Sistema-empresa: PostgreSQL compatible con Supabase y AWS RDS.
-- Ejecutar en una base nueva. No elimina tablas existentes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE public."Role" AS ENUM ('ADMIN','RH','COORDINACION','OPERADOR','PM','GERENCIA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."PermisoTipo" AS ENUM ('VACACIONES','PERSONAL','MEDICO','TRAMITE','OTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."PermisoEstado" AS ENUM ('ENVIADO','APROBADO','RECHAZADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."ProjectCode" AS ENUM ('COLOMBIA','PERU','ITALIA','GENERAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.projects (
 id SERIAL PRIMARY KEY,
 code public."ProjectCode" NOT NULL UNIQUE,
 name TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.users (
 id SERIAL PRIMARY KEY,
 username TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 email TEXT,
 role public."Role" NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 password TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.employees (
 id SERIAL PRIMARY KEY,
 username TEXT NOT NULL UNIQUE REFERENCES public.users(username) ON DELETE CASCADE ON UPDATE CASCADE,
 cedula TEXT UNIQUE,
 email TEXT,
 puesto TEXT,
 supervisor TEXT,
 start_date TIMESTAMP(3),
 vacaciones_saldo DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "projectId" INTEGER REFERENCES public.projects(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS employees_project_id_idx ON public.employees("projectId");

CREATE TABLE IF NOT EXISTS public.permisos (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 username TEXT NOT NULL REFERENCES public.users(username) ON DELETE CASCADE ON UPDATE CASCADE,
 tipo public."PermisoTipo" NOT NULL,
 fecha_inicio TIMESTAMP(3) NOT NULL,
 fecha_fin TIMESTAMP(3) NOT NULL,
 motivo TEXT NOT NULL,
 estado public."PermisoEstado" NOT NULL DEFAULT 'ENVIADO',
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "projectId" INTEGER REFERENCES public.projects(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS permisos_username_idx ON public.permisos(username);
CREATE INDEX IF NOT EXISTS permisos_project_id_idx ON public.permisos("projectId");

CREATE TABLE IF NOT EXISTS public.horas_extra_mes (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 ordinarias DECIMAL(65,30) NOT NULL DEFAULT 0,
 feriados DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT horas_extra_mes_unique UNIQUE ("employeeId",year,month)
);
CREATE INDEX IF NOT EXISTS horas_extra_mes_year_month_idx ON public.horas_extra_mes(year,month);

CREATE TABLE IF NOT EXISTS public.horas_extra_dia (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 date TIMESTAMP(3) NOT NULL,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 day INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 ordinarias DECIMAL(65,30) NOT NULL DEFAULT 0,
 feriados DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 justificacion TEXT,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT horas_extra_dia_unique UNIQUE ("employeeId",date)
);
CREATE INDEX IF NOT EXISTS horas_extra_dia_year_month_idx ON public.horas_extra_dia(year,month);

CREATE TABLE IF NOT EXISTS public.bonos_mes (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 productividad DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad DECIMAL(65,30) NOT NULL DEFAULT 0,
 qc DECIMAL(65,30) NOT NULL DEFAULT 0,
 validacion DECIMAL(65,30) NOT NULL DEFAULT 0,
 supervision DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad_sup DECIMAL(65,30) NOT NULL DEFAULT 0,
 supervision_sig DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad_sig DECIMAL(65,30) NOT NULL DEFAULT 0,
 bono_fijo DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT bonos_mes_unique UNIQUE ("employeeId",year,month)
);
CREATE INDEX IF NOT EXISTS bonos_mes_year_month_idx ON public.bonos_mes(year,month);

-- Estas tablas se consultan exclusivamente desde el backend con un rol PostgreSQL
-- de privilegios mínimos. No exponer la cadena DATABASE_URL al navegador.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extra_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extra_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonos_mes ENABLE ROW LEVEL SECURITY;
-- No se crean políticas de acceso público. Configurar permisos del rol backend
-- y políticas RLS antes de habilitar acceso a usuarios reales.
