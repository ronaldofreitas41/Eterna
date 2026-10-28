import "server-only";
import { unstable_rethrow } from "next/navigation";
import { pgCode } from "./db";
import { FileError } from "./files";
import { ActionError } from "./panel";

// Resultado padrão das ações do servidor: a interface mostra a mensagem de erro ou usa os dados.
export type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

export async function guard<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    unstable_rethrow(err); // deixa redirecionamentos do Next passarem
    if (err instanceof ActionError || err instanceof FileError) return { ok: false, error: err.message };
    const code = pgCode(err);
    if (code === "23505") return { ok: false, error: "Esse valor já está em uso. Escolham outro." };
    if (code === "23514" || code === "22001" || code === "22007" || code === "22P02")
      return { ok: false, error: "Confiram os campos: algum valor está fora do formato ou do tamanho permitido." };
    console.error("[acao]", err);
    return { ok: false, error: "Não foi possível concluir agora. Tentem de novo." };
  }
}

export const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
