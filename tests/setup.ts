import { existsSync, readFileSync } from "node:fs";

// Carrega o .env.local para os testes de integração (DATABASE_URL).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Os testes de integração não devem enviar textos ao provedor de IA (nem gastar a cota gratuita).
process.env.AI_CLASSIFY_CONTRIBUTIONS = "false";
