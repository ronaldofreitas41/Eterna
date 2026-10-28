"use server";

import { guard, text, type Result } from "@/lib/action";
import { one, query } from "@/lib/db";
import { ActionError, isUuid, ownedWeddingOrThrow } from "@/lib/panel";
import type { Task } from "@/lib/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addTask(weddingId: string, title: string, due: string | null): Promise<Result<Task>> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    const t = text(title, 200);
    if (!t) throw new ActionError("Escrevam a tarefa.");
    return (await one<Task>("insert into tasks (wedding_id, title, due_date) values ($1, $2, $3) returning *", [wedding.id, t, due && DATE.test(due) ? due : null]))!;
  });
}

export async function setTaskDone(weddingId: string, id: string, done: boolean): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Tarefa não encontrada.");
    await query("update tasks set done = $1 where id = $2 and wedding_id = $3", [Boolean(done), id, wedding.id]);
    return null;
  });
}

export async function deleteTask(weddingId: string, id: string): Promise<Result> {
  return guard(async () => {
    const { wedding } = await ownedWeddingOrThrow(weddingId);
    if (!isUuid(id)) throw new ActionError("Tarefa não encontrada.");
    await query("delete from tasks where id = $1 and wedding_id = $2", [id, wedding.id]);
    return null;
  });
}
