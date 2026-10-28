import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// Datas e horários chegam como texto (ISO), como o resto da aplicação espera; date fica "AAAA-MM-DD", sem fuso.
for (const oid of [1082, 1114, 1184]) types.setTypeParser(oid, (v: string) => (oid === 1082 ? v : new Date(v).toISOString()));

// Conexão única com o PostgreSQL (Neon). Reaproveitada entre recarregamentos no modo de desenvolvimento.
const globalForDb = globalThis as unknown as { eternaPool?: Pool };

export const isDatabaseConfigured = () => Boolean(process.env.DATABASE_URL);

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada");
  globalForDb.eternaPool ??= new Pool({
    // "require" vira "verify-full" (o comportamento atual do driver), explícito para evitar o aviso de depreciação.
    connectionString: process.env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full"),
    max: 5,
    idleTimeoutMillis: 30_000,
  });
  return globalForDb.eternaPool;
}

type Executor = Pick<PoolClient, "query">;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = [], db: Executor = pool()) {
  const res = await db.query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = [], db?: Executor) {
  return (await query<T>(text, params, db))[0] ?? null;
}

/** Executa várias operações numa transação: tudo ou nada. */
export async function tx<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** Código de erro do Postgres (ex.: 23505 = valor único repetido). */
export const pgCode = (err: unknown) => (err as { code?: string })?.code;
