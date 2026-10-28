"use server";

import { randomUUID } from "node:crypto";
import { guard, text, type Result } from "@/lib/action";
import { one, query } from "@/lib/db";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";
import type { Guest, GuestGroup } from "@/lib/types";

type GroupInput = { name: string; max_party_size: number; sees_logistics: boolean; message: string };

function groupValues(g: GroupInput) {
  const name = text(g.name, 80);
  if (!name) throw new ActionError("Deem um nome ao grupo.");
  const max = Math.trunc(Number(g.max_party_size));
  if (!(max >= 1 && max <= 20)) throw new ActionError("Cada convite pode ter de 1 a 20 pessoas.");
  return [name, max, Boolean(g.sees_logistics), text(g.message, 2000)] as const;
}

/** Grupo precisa ser do mesmo casamento (evita mover convidados para grupos de outro casal). */
async function checkGroup(weddingId: string, groupId: string | null) {
  if (groupId === null) return null;
  if (!isUuid(groupId) || !(await one("select 1 from guest_groups where id = $1 and wedding_id = $2", [groupId, weddingId])))
    throw new ActionError("Grupo não encontrado.");
  return groupId;
}

export async function createGroup(weddingId: string, g: GroupInput): Promise<Result<GuestGroup>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const pos = (await one<{ n: number }>("select count(*)::int as n from guest_groups where wedding_id = $1", [wedding.id]))!.n;
    return (await one<GuestGroup>(
      "insert into guest_groups (wedding_id, name, max_party_size, sees_logistics, message, position) values ($1, $2, $3, $4, $5, $6) returning *",
      [wedding.id, ...groupValues(g), pos],
    ))!;
  });
}

export async function updateGroup(weddingId: string, id: string, g: GroupInput): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await checkGroup(wedding.id, id);
    await query("update guest_groups set name = $1, max_party_size = $2, sees_logistics = $3, message = $4 where id = $5 and wedding_id = $6", [...groupValues(g), id, wedding.id]);
    return null;
  });
}

export async function deleteGroup(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await checkGroup(wedding.id, id);
    await query("delete from guest_groups where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}

export async function createGuest(weddingId: string, g: { name: string; contact: string; group_id: string | null }): Promise<Result<Guest>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const name = text(g.name, 120);
    if (!name) throw new ActionError("Informem o nome do convidado.");
    const group = await checkGroup(wedding.id, g.group_id || null);
    return (await one<Guest>("insert into guests (wedding_id, name, contact, group_id) values ($1, $2, $3, $4) returning *", [wedding.id, name, text(g.contact, 160), group]))!;
  });
}

export async function setGuestGroup(weddingId: string, id: string, groupId: string | null): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Convidado não encontrado.");
    await query("update guests set group_id = $1 where id = $2 and wedding_id = $3", [await checkGroup(wedding.id, groupId || null), id, wedding.id]);
    return null;
  });
}

/** Gera um novo link de convite; o anterior deixa de funcionar. */
export async function regenerateInvite(weddingId: string, id: string): Promise<Result<string>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Convidado não encontrado.");
    const token = randomUUID();
    const row = await one("update guests set invite_token = $1 where id = $2 and wedding_id = $3 returning id", [token, id, wedding.id]);
    if (!row) throw new ActionError("Convidado não encontrado.");
    return token;
  });
}

export async function deleteGuest(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Convidado não encontrado.");
    await query("delete from guests where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}

export async function deleteRsvp(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Confirmação não encontrada.");
    await query("delete from rsvps where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}
