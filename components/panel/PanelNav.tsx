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
  const base = `/painel/${id}`;
  // Menu curto: o resto aparece dentro de cada área, quando faz sentido.
  const items = [
    { href: base, label: "Início", also: [] as string[] },
    { href: `${base}/site`, label: "Meu site", also: [`${base}/programacao`, `${base}/editor`, `${base}/estudio`] },
    { href: `${base}/convidados`, label: "Convidados", also: [] },
    { href: `${base}/memorias`, label: "Memórias", badge: pending.juntos + pending.fotos, also: [`${base}/juntos`, `${base}/fotos`] },
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
            Ver o site publicado
          </a>
        )}
      </div>
      <nav id="panel-menu" aria-label="Painel do casamento">
        {items.map((it) => {
          const active = it.href === base ? path === base : path.startsWith(it.href) || it.also.some((a) => path.startsWith(a));
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
              {it.label}
              {it.badge ? (
                <span className="badge" aria-label={`${it.badge} aguardando revisão`}>
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="panel-nav-foot">
        <Link href={`${base}/configuracoes`} className="text-link" onClick={() => setOpen(false)}>
          Configurações
        </Link>
        <Link href="/painel" className="text-link">
          Trocar de casamento
        </Link>
        <span className="mono">{email}</span>
        <form action="/sair" method="post">
          <button className="text-link">Sair</button>
        </form>
      </div>
    </aside>
  );
}
