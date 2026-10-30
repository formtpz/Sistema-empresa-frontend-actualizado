import "server-only";
import { Pool, type QueryResultRow } from "pg";

const globalDb = globalThis as typeof globalThis & { __empresaPool?: Pool };

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no configurada");
  if (!globalDb.__empresaPool) {
    globalDb.__empresaPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
    });
  }
  return globalDb.__empresaPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(sql, [...params]);
  return result.rows;
}
