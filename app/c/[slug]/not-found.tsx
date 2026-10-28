import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap empty-page">
      <h1>Site não encontrado</h1>
      <p className="lede">Este endereço não existe ou o casal ainda não publicou o site. Confira o link que você recebeu.</p>
      <Link href="/" className="btn ghost">
        Conhecer a Eterna
      </Link>
    </main>
  );
}
