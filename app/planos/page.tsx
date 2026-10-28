import Link from "next/link";
import { formatBRL } from "@/lib/design";
import { PLANS, PLANS_ARE_DEMO } from "@/lib/plans";

export const metadata = { title: "Planos · Eterna", description: "Planos demonstrativos da Eterna: Essencial, Premium e Destination Wedding." };

const ROWS: { label: string; plans: ("essencial" | "premium" | "destination")[] }[] = [
  { label: "Site com endereço próprio na Eterna", plans: ["essencial", "premium", "destination"] },
  { label: "Estilos prontos e editor de cores e fontes", plans: ["essencial", "premium", "destination"] },
  { label: "Confirmação de presença e convites individuais", plans: ["essencial", "premium", "destination"] },
  { label: "Estúdio criativo com IA e referências", plans: ["premium", "destination"] },
  { label: "Versões, comparação e restauração", plans: ["premium", "destination"] },
  { label: "Construir Juntos, livro de mensagens e cápsula", plans: ["premium", "destination"] },
  { label: "Grupos com informações específicas", plans: ["premium", "destination"] },
  { label: "Programação de vários dias", plans: ["destination"] },
  { label: "Grupos de hospedagem e transporte", plans: ["destination"] },
];

export default function PlanosPage() {
  return (
    <div className="landing">
      <header className="l-mast wrap">
        <Link href="/" className="brand">
          Eterna
        </Link>
        <nav aria-label="Principal">
          <Link href="/exemplo">Exemplo</Link>
          <Link href="/entrar" className="btn ghost small">
            Entrar
          </Link>
        </nav>
      </header>
      <section className="l-section wrap">
        <span className="eyebrow">Planos</span>
        <h1 className="l-title">Escolham o tamanho da experiência</h1>
        {PLANS_ARE_DEMO && (
          <p className="notice">
            Valores de demonstração, ainda não definidos comercialmente. Não há pagamento nesta versão: todos os recursos implementados
            ficam disponíveis para testar.
          </p>
        )}
        <div className="plans">
          {PLANS.map((p) => (
            <article key={p.id} className={`plan${p.id === "premium" ? " featured" : ""}`}>
              <h2>{p.name}</h2>
              <p className="plan-price">
                {p.priceCents === 0 ? "Grátis" : formatBRL(p.priceCents)}
                <small> {p.period}</small>
              </p>
              <p className="muted">{p.pitch}</p>
              <Link href="/entrar?modo=criar" className={`btn ${p.id === "premium" ? "primary" : "ghost"}`}>
                Começar
              </Link>
            </article>
          ))}
        </div>
        <div className="table-wrap">
          <table className="table compare">
            <thead>
              <tr>
                <th>Recurso</th>
                {PLANS.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  {PLANS.map((p) => (
                    <td key={p.id}>{r.plans.includes(p.id) ? <span aria-label="incluído">●</span> : <span aria-label="não incluído" className="muted">–</span>}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td>Domínio personalizado</td>
                <td className="muted">–</td>
                <td colSpan={2} className="muted">Quando a integração estiver disponível</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
