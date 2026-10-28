import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatLongDate } from "@/lib/phase";
import type { Wedding } from "@/lib/types";
import AppHeader from "./AppHeader";
import DemoButton from "./DemoButton";

export const metadata = { title: "Seus casamentos · Eterna" };

export default async function PainelPage() {
  const user = await requireUser();
  const weddings = await query<Wedding>("select * from weddings where owner_id = $1 order by created_at desc", [user.id]);
  if (!weddings.length) redirect("/painel/novo");

  return (
    <div className="wrap">
      <AppHeader email={user.email} />
      <section className="panel-home">
        <div className="panel-home-head">
          <h1>Seus casamentos</h1>
          <div className="row-actions">
            <DemoButton />
            <Link href="/painel/novo" className="btn primary">
              Novo casamento
            </Link>
          </div>
        </div>
        <div className="site-list">
          {weddings.map((w) => (
            <Link key={w.id} href={`/painel/${w.id}`} className="site-row">
              <span className="site-names">
                {w.partner_one} &amp; {w.partner_two}
              </span>
              <span className="mono">
                {formatLongDate(w.wedding_date) || "Data a definir"} · /c/{w.slug}
              </span>
              <span className="chips">
                {w.is_demo && <span className="chip">Demonstração</span>}
                <span className={`chip ${w.published ? "ok" : ""}`}>{w.published ? "Publicado" : "Rascunho"}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
