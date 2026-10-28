"use client";

import { useState } from "react";
import { addScheduleItem, deleteScheduleItem, saveLogistics, updateScheduleItem } from "@/app/painel/acoes/programacao";
import { formatLongDate } from "@/lib/phase";
import type { Logistics, ScheduleItem } from "@/lib/types";
import ConfirmButton from "@/components/panel/ConfirmButton";
import { useServerState } from "@/components/useServerState";

type Props = {
  weddingId: string;
  weddingDate: string | null;
  initialItems: ScheduleItem[];
  initialLogistics: Logistics;
  initialPublic: boolean;
};

const sortItems = (list: ScheduleItem[]) =>
  [...list].sort((a, b) => (a.day ?? "").localeCompare(b.day ?? "") || a.starts_at.localeCompare(b.starts_at));

export default function ScheduleManager({ weddingId, weddingDate, initialItems, initialLogistics, initialPublic }: Props) {
  const [items, setItems] = useServerState(initialItems);
  const [logistics, setLogistics] = useServerState(initialLogistics);
  const [isPublic, setIsPublic] = useServerState(initialPublic);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (text: string, ok = true) => setMsg({ text, ok });

  function read(f: FormData) {
    return {
      day: (f.get("day") as string) || null,
      starts_at: String(f.get("time") ?? ""),
      title: String(f.get("title") ?? ""),
      location: String(f.get("location") ?? ""),
      description: String(f.get("description") ?? ""),
    };
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const res = await addScheduleItem(weddingId, read(new FormData(form)));
    if (!res.ok) return say(res.error, false);
    setItems((l) => sortItems([...l, res.data]));
    form.reset();
    say(`“${res.data.title}” adicionado à programação.`);
  }

  async function save(item: ScheduleItem, f: FormData) {
    const res = await updateScheduleItem(weddingId, item.id, read(f));
    if (!res.ok) return say(res.error, false);
    setItems((l) => sortItems(l.map((x) => (x.id === item.id ? res.data : x))));
    say("Programação atualizada. Ela já aparece no site publicado.");
  }

  async function remove(item: ScheduleItem) {
    const res = await deleteScheduleItem(weddingId, item.id);
    if (!res.ok) return say(res.error, false);
    setItems((l) => l.filter((x) => x.id !== item.id));
    say("Item removido.");
  }

  async function onSaveLogistics(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next = {
      wedding_id: weddingId,
      address: String(f.get("address") ?? "").trim(),
      accommodation: String(f.get("accommodation") ?? "").trim(),
      transport: String(f.get("transport") ?? "").trim(),
    };
    const pub = f.get("public") === "on";
    const res = await saveLogistics(weddingId, next, pub);
    if (!res.ok) return say(res.error, false);
    setLogistics(next);
    setIsPublic(pub);
    say(pub ? "Logística salva e visível para todos no site." : "Logística salva. Só os grupos autorizados veem pelo convite individual.");
  }

  const fields = (item?: ScheduleItem) => (
    <>
      <div className="row3">
        <label className="field">
          <span>Dia (para programações de vários dias)</span>
          <input id={`sch-day-${item?.id ?? "new"}`} name="day" type="date" defaultValue={item?.day ?? ""} />
        </label>
        <label className="field">
          <span>Horário</span>
          <input id={`sch-time-${item?.id ?? "new"}`} name="time" type="time" required defaultValue={item?.starts_at.slice(0, 5)} />
        </label>
        <label className="field">
          <span>Local</span>
          <input id={`sch-loc-${item?.id ?? "new"}`} name="location" maxLength={160} defaultValue={item?.location} />
        </label>
      </div>
      <label className="field">
        <span>O que acontece</span>
        <input id={`sch-title-${item?.id ?? "new"}`} name="title" required maxLength={120} defaultValue={item?.title} />
      </label>
      <label className="field">
        <span>Detalhes (opcional)</span>
        <input id={`sch-desc-${item?.id ?? "new"}`} name="description" maxLength={1000} defaultValue={item?.description} />
      </label>
    </>
  );

  return (
    <div className="stack-lg">
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}
      <section className="card">
        <h2>Programação</h2>
        {weddingDate && <p className="muted small">Casamento em {formatLongDate(weddingDate)}. Deixem o dia em branco se tudo acontece na mesma data.</p>}
        {items.length === 0 && <p className="muted">Nenhum item ainda. Comecem pela cerimônia.</p>}
        <div className="group-list">
          {items.map((it) => (
            <details key={it.id} className="group">
              <summary>
                <strong>
                  {it.starts_at.slice(0, 5).replace(":", "h")} · {it.title}
                </strong>
                <span className="mono">{[it.day && formatLongDate(it.day), it.location].filter(Boolean).join(" · ")}</span>
              </summary>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  save(it, new FormData(e.currentTarget));
                }}
              >
                {fields(it)}
                <div className="row-actions">
                  <button className="btn ghost small">Salvar</button>
                  <ConfirmButton label="Remover" confirmLabel="Confirmar remoção" onConfirm={() => remove(it)} />
                </div>
              </form>
            </details>
          ))}
        </div>
        <form className="form inline-card" onSubmit={add}>
          <h3 className="sub">Novo item</h3>
          {fields()}
          <button className="btn primary small">Adicionar à programação</button>
        </form>
      </section>

      <section className="card">
        <h2>Endereço, hospedagem e transporte</h2>
        <form className="form" onSubmit={onSaveLogistics}>
          <label className="field">
            <span>Endereço completo</span>
            <input id="log-address" name="address" maxLength={300} defaultValue={logistics.address} />
          </label>
          <label className="field">
            <span>Hospedagem</span>
            <textarea id="log-acc" name="accommodation" rows={3} maxLength={4000} defaultValue={logistics.accommodation} />
          </label>
          <label className="field">
            <span>Transporte</span>
            <textarea id="log-transport" name="transport" rows={3} maxLength={4000} defaultValue={logistics.transport} />
          </label>
          <label className="check">
            <input id="log-public" name="public" type="checkbox" defaultChecked={isPublic} />
            <span>
              Mostrar para qualquer pessoa com o link do site. Desmarcado, só aparece para os grupos com permissão, pelo convite
              individual.
            </span>
          </label>
          <button className="btn primary small">Salvar logística</button>
        </form>
      </section>
    </div>
  );
}
