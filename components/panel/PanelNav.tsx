"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = {
  id: string;
  names: string;
  slug: string;
  published: boolean;
  isDemo: boolean;
  email: string;
  pending: { juntos: number; fotos: number };
};

export default function PanelNav({ id, names, slug, published, isDemo, email, pending }: Props) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: `/painel/${id}`, label: "Visão geral" },
    { href: `/painel/${id}/estudio`, label: "Estúdio criativo" },
    { href: `/painel/${id}/editor`, label: "Editor do site" },
    { href: `/painel/${id}/convidados`, label: "Convidados" },
    { href: `/painel/${id}/programacao`, label: "Programação" },
    { href: `/painel/${id}/juntos`, label: "Construir Juntos", badge: pending.juntos },
    { href: `/painel/${id}/fotos`, label: "Fotos", badge: pending.fotos },
    { href: `/painel/${id}/configuracoes`, label: "Fases e configurações" },
  ];

  return (
    <aside className={`panel-nav${open ? " open" : ""}`}>
      <div className="panel-nav-head">
        <Link href="/painel" className="brand">
          Eterna
        </Link>
        <button type="button" className="btn ghost small menu-toggle" aria-expanded={open} aria-controls="panel-menu" onClick={() => setOpen((o) => !o)}>
          {open ? "Fechar" : "Menu"}
        </button>
      </div>
      <div className="panel-couple">
        <strong>{names}</strong>
        <span className="chips">
          {isDemo && <span className="chip">Demonstração</span>}
          <span className={`chip ${published ? "ok" : ""}`}>{published ? "Publicado" : "Rascunho"}</span>
        </span>
        {published && (
          <a href={`/c/${slug}`} target="_blank" rel="noopener noreferrer" className="text-link">
            Abrir site público
          </a>
        )}
      </div>
      <nav id="panel-menu" aria-label="Painel do casamento">
        {items.map((it) => {
          const active = it.href === `/painel/${id}` ? path === it.href : path.startsWith(it.href);
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
              {it.label}
              {it.badge ? <span className="badge" aria-label={`${it.badge} aguardando`}>{it.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="panel-nav-foot">
        <span className="mono">{email}</span>
        <Link href="/painel" className="text-link">
          Trocar de casamento
        </Link>
        <form action="/sair" method="post">
          <button className="text-link">Sair</button>
        </form>
      </div>
    </aside>
  );
}
