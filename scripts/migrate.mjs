// Aplica as migrações de db/migrations em ordem, uma única vez cada (controle em schema_migrations).
// Uso: npm run db:migrate   (lê DATABASE_URL do ambiente ou do .env.local)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL no .env.local.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL.replace("sslmode=require", "sslmode=verify-full") });
await client.connect();
await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));

const dir = join("db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
let applied = 0;
for (const file of files) {
  if (done.has(file)) continue;
  const sql = readFileSync(join(dir, file), "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into schema_migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`aplicada: ${file}`);
    applied++;
  } catch (err) {
    await client.query("rollback");
    console.error(`falhou: ${file}\n${err.message}`);
    await client.end();
    process.exit(1);
  }
}
console.log(applied ? `${applied} migração(ões) aplicada(s).` : "Banco já está atualizado.");
await client.end();
