"use client";

import { useEffect, useMemo, useState } from "react";
import { createGroup, createGuest, deleteGroup, deleteGuest, deleteRsvp, regenerateInvite, setGuestGroup, updateGroup } from "@/app/painel/acoes/convidados";
import type { Guest, GuestGroup, Rsvp } from "@/lib/types";
import ConfirmButton from "@/components/panel/ConfirmButton";
import CopyLinkButton from "@/components/panel/CopyLinkButton";
import { updateSettings } from "@/app/painel/acoes/configuracoes";
import { useServerState } from "@/components/useServerState";

type Props = { weddingId: string; slug: string; published: boolean; openRsvp: boolean; initialGroups: GuestGroup[]; initialGuests: Guest[]; initialRsvps: Rsvp[] };
type Status = "todos" | "sim" | "nao" | "aguardando";

const status = (g: Guest) => (g.attending === null ? "Aguardando" : g.attending ? `Vai · ${g.party_size} pessoa(s)` : "Não vai");

export default function GuestsManager({ weddingId, slug, published, openRsvp, initialGroups, initialGuests, initialRsvps }: Props) {
  const [groups, setGroups] = useServerState(initialGroups);
  const [guests, setGuests] = useServerState(initialGuests);
  const [rsvps, setRsvps] = useServerState(initialRsvps);
  const [filter, setFilter] = useState<string>("todos");
  const [answer, setAnswer] = useState<Status>("todos");
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(location.origin);
  }, []);
  const [open, setOpen] = useServerState(openRsvp);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const say = (text: string, ok = true) => setMsg({ text, ok });

  const shown = useMemo(
    () =>
      guests.filter(
        (g) =>
          (filter === "todos" || (filter === "sem-grupo" ? !g.group_id : g.group_id === filter)) &&
          (answer === "todos" || (answer === "sim" ? g.attending === true : answer === "nao" ? g.attending === false : g.attending === null)),
      ),
    [guests, filter, answer],
  );
  const totals = {
    going: guests.filter((g) => g.attending).reduce((s, g) => s + g.party_size, 0) + rsvps.filter((r) => r.attending).reduce((s, r) => s + r.party_size, 0),
    waiting: guests.filter((g) => g.attending === null).length,
    declined: guests.filter((g) => g.attending === false).length + rsvps.filter((r) => !r.attending).length,
  };

  async function toggleOpenRsvp(next: boolean) {
    setOpen(next);
    const res = await updateSettings(weddingId, { open_rsvp: next });
    if (!res.ok) {
      setOpen(!next);
      return say(res.error, false);
    }
    say(next ? "Qualquer pessoa com o link do site pode confirmar presença." : "Agora só quem tem convite individual confirma presença.");
  }

  async function addGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const res = await createGroup(weddingId, {
      name: String(f.get("name") ?? ""),
      max_party_size: Number(f.get("max") || 1),
      sees_logistics: f.get("logistics") === "on",
      message: String(f.get("message") ?? ""),
    });
    if (!res.ok) return say(res.error, false);
    setGroups((g) => [...g, res.data]);
    form.reset();
    say(`Grupo “${res.data.name}” criado.`);
  }

  async function saveGroup(g: GuestGroup, patch: Pick<GuestGroup, "name" | "max_party_size" | "sees_logistics" | "message">) {
    const res = await updateGroup(weddingId, g.id, patch);
    if (!res.ok) return say(res.error, false);
    setGroups((list) => list.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
    say("Grupo atualizado.");
  }

  async function removeGroup(g: GuestGroup) {
    const res = await deleteGroup(weddingId, g.id);
    if (!res.ok) return say(res.error, false);
    setGroups((list) => list.filter((x) => x.id !== g.id));
    setGuests((list) => list.map((x) => (x.group_id === g.id ? { ...x, group_id: null } : x)));
    say("Grupo excluído. Os convidados dele ficaram sem grupo.");
  }

  async function addGuest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const res = await createGuest(weddingId, {
      name: String(f.get("name") ?? ""),
      contact: String(f.get("contact") ?? ""),
      group_id: (f.get("group") as string) || null,
    });
    if (!res.ok) return say(res.error, false);
    setGuests((list) => [...list, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    form.reset();
    say(`${res.data.name} adicionado.`);
  }

  async function changeGroup(g: Guest, groupId: string | null) {
    const res = await setGuestGroup(weddingId, g.id, groupId);
    if (!res.ok) return say(res.error, false);
    setGuests((list) => list.map((x) => (x.id === g.id ? { ...x, group_id: groupId } : x)));
    say("Convidado atualizado.");
  }

  async function removeGuest(g: Guest) {
    const res = await deleteGuest(weddingId, g.id);
    if (!res.ok) return say(res.error, false);
    setGuests((list) => list.filter((x) => x.id !== g.id));
    say(`${g.name} foi excluído, com a confirmação dele.`);
  }

  async function removeRsvp(r: Rsvp) {
    const res = await deleteRsvp(weddingId, r.id);
    if (!res.ok) return say(res.error, false);
    setRsvps((list) => list.filter((x) => x.id !== r.id));
    say("Confirmação excluída.");
  }

  async function copyLink(g: Guest) {
    const link = `${location.origin}/c/${slug}?convite=${g.invite_token}`;
    try {
      await navigator.clipboard.writeText(link);
      say(`Link de ${g.name} copiado.`);
    } catch {
      window.prompt("Copiem o link do convite:", link);
    }
  }

  async function regenerate(g: Guest) {
    const res = await regenerateInvite(weddingId, g.id);
    if (!res.ok) return say(res.error, false);
    setGuests((list) => list.map((x) => (x.id === g.id ? { ...x, invite_token: res.data } : x)));
    say(`Novo link gerado para ${g.name}. O anterior deixou de funcionar.`);
  }

  return (
    <div className="stack-lg">
      {msg && (
        <p className={`notice${msg.ok ? " ok" : ""}`} role="status">
          {msg.text}
        </p>
      )}

      <section className="card share-card">
        <div className="stack">
          <h2>Convide pelo link do site</h2>
          <p className="muted">Os convidados abrem o site e confirmam presença em poucos toques, sem precisar de cadastro.</p>
          {!published && <p className="notice">Publiquem o site em “Meu site” para o link funcionar para os convidados.</p>}
          <div className="row-actions">
            <CopyLinkButton path={`/c/${slug}`} label="Copiar link do convite" className="btn primary" />
            <a
              className="btn ghost"
              href={`https://wa.me/?text=${encodeURIComponent("Vocês estão convidados para o nosso casamento! Confirmem a presença aqui: " + origin + "/c/" + slug)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Enviar pelo WhatsApp
            </a>
          </div>
          <label className="check">
            <input id="open-rsvp" type="checkbox" checked={open} onChange={(e) => toggleOpenRsvp(e.target.checked)} />
            <span>Qualquer pessoa com o link pode confirmar presença. Desmarquem para aceitar só convites individuais.</span>
          </label>
        </div>
      </section>

      <section className="stats small">
        <div className="stat">
          <span className="stat-n">{totals.going}</span>
          <span>pessoas confirmadas</span>
        </div>
        <div className="stat">
          <span className="stat-n">{totals.waiting}</span>
          <span>convites sem resposta</span>
        </div>
        <div className="stat">
          <span className="stat-n">{totals.declined}</span>
          <span>não poderão ir</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Convidados</h2>
          <div className="seg" role="group" aria-label="Filtrar por resposta">
            {(
              [
                ["todos", "Todos"],
                ["sim", "Confirmaram"],
                ["nao", "Recusaram"],
                ["aguardando", "Sem resposta"],
              ] as [Status, string][]
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={answer === v} onClick={() => setAnswer(v)}>
                {l}
              </button>
            ))}
          </div>
          <a className="btn ghost small" href={`/api/exportar/${weddingId}/convidados`} download>
            Exportar lista
          </a>
          <label className="field inline">
            <span className="sr-only">Filtrar por grupo</span>
            <select id="guest-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="todos">Todos os grupos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
              <option value="sem-grupo">Sem grupo</option>
            </select>
          </label>
        </div>
        <form className="inline-form wrap-sm" onSubmit={addGuest}>
          <input id="nguest-name" name="name" aria-label="Nome do convidado" placeholder="Nome do convidado" required maxLength={120} />
          <input id="nguest-contact" name="contact" aria-label="E-mail ou telefone" placeholder="E-mail ou telefone (opcional)" maxLength={160} />
          <select id="nguest-group" name="group" aria-label="Grupo" defaultValue="">
            <option value="">Sem grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button className="btn primary small">Adicionar</button>
        </form>
        {shown.length === 0 ? (
          <p className="muted">
            {guests.length === 0
              ? "Nenhum convidado cadastrado. Vocês podem só compartilhar o link do site, ou cadastrar convidados para enviar convites individuais."
              : "Nenhum convidado neste filtro."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Grupo</th>
                  <th>Resposta</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <strong>{g.name}</strong>
                      {g.contact && <small className="block muted">{g.contact}</small>}
                      {g.companions && <small className="block muted">Com: {g.companions}</small>}
                      {g.rsvp_message && <small className="block">“{g.rsvp_message}”</small>}
                    </td>
                    <td>
                      <select
                        id={`guest-group-${g.id}`}
                        aria-label={`Grupo de ${g.name}`}
                        value={g.group_id ?? ""}
                        onChange={(e) => changeGroup(g, e.target.value || null)}
                      >
                        <option value="">Sem grupo</option>
                        {groups.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`chip ${g.attending ? "ok" : g.attending === false ? "no" : ""}`}>{status(g)}</span>
                    </td>
                    <td className="actions">
                      <button type="button" className="text-link" onClick={() => copyLink(g)}>
                        Copiar convite
                      </button>
                      <button type="button" className="text-link" onClick={() => regenerate(g)}>
                        Gerar novo link
                      </button>
                      <ConfirmButton label="Excluir" confirmLabel={`Excluir ${g.name}?`} onConfirm={() => removeGuest(g)} small />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="card groups-card">
        <summary>
          <h2>Organizar por grupos</h2>
          <span className="muted small">opcional · convites individuais, acompanhantes e informações por grupo</span>
        </summary>
        <p className="muted small">
          O grupo define quantas pessoas cada convite pode confirmar, se vê hospedagem e transporte e uma mensagem só para ele.
        </p>
        <div className="group-list">
          {groups.map((g) => (
            <details key={g.id} className="group">
              <summary>
                <strong>{g.name}</strong>
                <span className="mono">
                  {guests.filter((x) => x.group_id === g.id).length} convidados · até {g.max_party_size} por convite
                  {g.sees_logistics ? " · vê logística" : ""}
                </span>
              </summary>
              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  saveGroup(g, {
                    name: String(f.get("name")).trim(),
                    max_party_size: Number(f.get("max") || 1),
                    sees_logistics: f.get("logistics") === "on",
                    message: String(f.get("message") ?? "").trim(),
                  });
                }}
              >
                <div className="row2">
                  <label className="field">
                    <span>Nome</span>
                    <input id={`g-name-${g.id}`} name="name" defaultValue={g.name} required maxLength={80} />
                  </label>
                  <label className="field">
                    <span>Pessoas por convite</span>
                    <input id={`g-max-${g.id}`} name="max" type="number" min={1} max={20} defaultValue={g.max_party_size} />
                  </label>
                </div>
                <label className="check">
                  <input id={`g-log-${g.id}`} name="logistics" type="checkbox" defaultChecked={g.sees_logistics} />
                  <span>Pode ver hospedagem, transporte e endereço completo</span>
                </label>
                <label className="field">
                  <span>Mensagem para este grupo</span>
                  <textarea id={`g-msg-${g.id}`} name="message" rows={2} maxLength={2000} defaultValue={g.message} />
                </label>
                <div className="row-actions">
                  <button className="btn ghost small">Salvar grupo</button>
                  <ConfirmButton label="Excluir grupo" confirmLabel="Confirmar exclusão" onConfirm={() => removeGroup(g)} />
                </div>
              </form>
            </details>
          ))}
        </div>
        <form className="form inline-card" onSubmit={addGroup}>
          <h3 className="sub">Novo grupo</h3>
          <div className="row2">
            <label className="field">
              <span>Nome</span>
              <input id="ng-name" name="name" required maxLength={80} placeholder="Ex.: Padrinhos" />
            </label>
            <label className="field">
              <span>Pessoas por convite</span>
              <input id="ng-max" name="max" type="number" min={1} max={20} defaultValue={2} />
            </label>
          </div>
          <label className="check">
            <input id="ng-log" name="logistics" type="checkbox" />
            <span>Pode ver hospedagem, transporte e endereço completo</span>
          </label>
          <label className="field">
            <span>Mensagem para este grupo (opcional)</span>
            <textarea id="ng-msg" name="message" rows={2} maxLength={2000} />
          </label>
          <button className="btn ghost small">Criar grupo</button>
        </form>
      </details>

      <section className="card">
        <h2>Confirmações pelo link aberto</h2>
        <p className="muted small">Respostas de quem confirmou pelo endereço geral do site, sem convite individual.</p>
        {rsvps.length === 0 ? (
          <p className="muted">Nenhuma confirmação pelo link aberto.</p>
        ) : (
          <ul className="rsvp-list">
            {rsvps.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.name}</strong> <span className={`chip ${r.attending ? "ok" : "no"}`}>{r.attending ? `Vai · ${r.party_size}` : "Não vai"}</span>
                  {r.contact && <small className="block muted">{r.contact}</small>}
                  {r.message && <small className="block">“{r.message}”</small>}
                </div>
                <ConfirmButton label="Excluir" confirmLabel="Confirmar" onConfirm={() => removeRsvp(r)} small />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
