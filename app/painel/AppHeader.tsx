import Link from "next/link";

export default function AppHeader({ email }: { email: string }) {
  return (
    <header className="mast">
      <Link href="/painel" className="brand">
        Eterna
      </Link>
      <div className="mast-actions">
        <span className="mono hide-sm">{email}</span>
        <form action="/sair" method="post">
          <button className="btn ghost small">Sair</button>
        </form>
      </div>
    </header>
  );
}
