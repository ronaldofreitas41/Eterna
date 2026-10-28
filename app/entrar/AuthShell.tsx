import Link from "next/link";
import { isDatabaseConfigured } from "@/lib/db";

export default function AuthShell({ title, lede, children, art = true }: { title: string; lede?: string; children: React.ReactNode; art?: boolean }) {
  return (
    <main className={`auth-page${art ? "" : " single"}`}>
      {art && (
        <div className="auth-art" aria-hidden="true">
          <p className="auth-quote">A história de vocês, construída por todos.</p>
        </div>
      )}
      <section className="auth-card">
        <Link href="/" className="brand">
          Eterna
        </Link>
        <h1>{title}</h1>
        {lede && <p className="lede">{lede}</p>}
        {isDatabaseConfigured() ? (
          children
        ) : (
          <p className="notice" role="alert">
            O banco de dados ainda não foi configurado. Preencham DATABASE_URL no arquivo .env.local e rodem npm run db:migrate (veja o
            README). Enquanto isso, vejam o <Link href="/exemplo">casamento de exemplo</Link>.
          </p>
        )}
      </section>
    </main>
  );
}
