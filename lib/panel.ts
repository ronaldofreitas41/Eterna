import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser, requireUser } from "./auth";
import { one } from "./db";
import type { Wedding } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === "string" && UUID.test(s);

/**
 * Casamento do usuário logado. É a porta de entrada de toda página e ação do painel:
 * sem sessão vai para o login; casamento de outra pessoa responde 404 (mesmo se o site for público).
 */
export const getOwnedWedding = cache(async (id: string) => {
  const user = await requireUser();
  if (!isUuid(id)) notFound();
  const wedding = await one<Wedding>("select * from weddings where id = $1 and owner_id = $2", [id, user.id]);
  if (!wedding) notFound();
  return { user, wedding };
});

/** Para ações do servidor: mesma verificação, mas com mensagem de erro em vez de navegar. */
export async function ownedWeddingOrThrow(id: unknown) {
  const user = await getCurrentUser();
  if (!user) throw new ActionError("Sua sessão expirou. Entrem de novo.");
  if (!isUuid(id)) throw new ActionError("Casamento não encontrado.");
  const wedding = await one<Wedding>("select * from weddings where id = $1 and owner_id = $2", [id, user.id]);
  if (!wedding) throw new ActionError("Casamento não encontrado.");
  return { user, wedding };
}

export class ActionError extends Error {}
