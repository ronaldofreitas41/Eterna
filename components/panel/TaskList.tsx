"use client";

import { useState } from "react";
import { addTask, deleteTask, setTaskDone } from "@/app/painel/acoes/tarefas";
import { formatLongDate } from "@/lib/phase";
import type { Task } from "@/lib/types";
import { useServerState } from "@/components/useServerState";

export default function TaskList({ weddingId, initial }: { weddingId: string; initial: Task[] }) {
  const [tasks, setTasks] = useServerState(initial);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await addTask(weddingId, title, due || null);
    if (!res.ok) return setError(res.error);
    setTasks((t) => [...t, res.data]);
    setTitle("");
    setDue("");
    setError("");
  }

  async function toggle(t: Task) {
    setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    const res = await setTaskDone(weddingId, t.id, !t.done);
    if (!res.ok) {
      setTasks((list) => list.map((x) => (x.id === t.id ? t : x)));
      setError(res.error);
    }
  }

  async function remove(t: Task) {
    const res = await deleteTask(weddingId, t.id);
    if (!res.ok) return setError(res.error);
    setTasks((list) => list.filter((x) => x.id !== t.id));
  }

  return (
    <div className="tasks">
      {tasks.length === 0 && <p className="muted small">Nenhuma tarefa ainda. Anotem aqui o que falta resolver.</p>}
      <ul>
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? "done" : undefined}>
            <label className="check">
              <input id={`task-${t.id}`} type="checkbox" checked={t.done} onChange={() => toggle(t)} />
              <span>
                {t.title}
                {t.due_date && <small> · até {formatLongDate(t.due_date)}</small>}
              </span>
            </label>
            <button type="button" className="text-link danger small" onClick={() => remove(t)} aria-label={`Remover ${t.title}`}>
              Remover
            </button>
          </li>
        ))}
      </ul>
      <form className="inline-form" onSubmit={add}>
        <input id="task-new-title" aria-label="Nova tarefa" placeholder="Nova tarefa" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        <input id="task-new-due" aria-label="Prazo" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn ghost small">Adicionar</button>
      </form>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
