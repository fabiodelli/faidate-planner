import { Pool } from "pg";

// Pool condiviso tra hot-reload di Next (evita di esaurire le connessioni in dev).
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function hasDb(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL non configurato");
  }
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return globalForDb.pgPool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(sql, params);
  return res.rows as T[];
}
