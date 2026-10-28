"use server";

import { guard, text, type Result } from "@/lib/action";
import { one, query, tx } from "@/lib/db";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";
import type { Logistics, ScheduleItem } from "@/lib/types";

type ItemInput = { day: string | null; starts_at: string; title: string; location: string; description: string };

function itemValues(i: ItemInput) {
  const title = text(i.title, 120);
  if (!title) throw new ActionError("Digam o que acontece neste horário.");
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(i.starts_at)) throw new ActionError("Informem um horário válido.");
  const day = i.day && /^\d{4}-\d{2}-\d{2}$/.test(i.day) ? i.day : null;
  return [day, i.starts_at, title, text(i.location, 160), text(i.description, 1000)] as const;
}

export async function addScheduleItem(weddingId: string, i: ItemInput): Promise<Result<ScheduleItem>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    return (await one<ScheduleItem>(
      "insert into schedule_items (wedding_id, day, starts_at, title, location, description) values ($1, $2, $3, $4, $5, $6) returning *",
      [wedding.id, ...itemValues(i)],
    ))!;
  });
}

export async function updateScheduleItem(weddingId: string, id: string, i: ItemInput): Promise<Result<ScheduleItem>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Item não encontrado.");
    const row = await one<ScheduleItem>(
      "update schedule_items set day = $1, starts_at = $2, title = $3, location = $4, description = $5 where id = $6 and wedding_id = $7 returning *",
      [...itemValues(i), id, wedding.id],
    );
    if (!row) throw new ActionError("Item não encontrado.");
    return row;
  });
}

export async function deleteScheduleItem(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Item não encontrado.");
    await query("delete from schedule_items where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}

export async function saveLogistics(weddingId: string, l: Omit<Logistics, "wedding_id">, isPublic: boolean): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    await tx(async (db) => {
      await query(
        `insert into wedding_logistics (wedding_id, address, accommodation, transport) values ($1, $2, $3, $4)
         on conflict (wedding_id) do update set address = excluded.address, accommodation = excluded.accommodation, transport = excluded.transport`,
        [wedding.id, text(l.address, 300), text(l.accommodation, 4000), text(l.transport, 4000)],
        db,
      );
      await query("update weddings set logistics_public = $1 where id = $2", [Boolean(isPublic), wedding.id], db);
    });
    return null;
  });
}
