import Link from "next/link";
import AuthShell from "../AuthShell";
import NewPasswordForm from "./NewPasswordForm";

export const metadata = { title: "Nova senha · Eterna" };

export default async function NovaSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Nova senha" art={false}>
      {token ? (
        <NewPasswordForm token={token} />
      ) : (
        <p className="notice" role="alert">
          Link incompleto. Abram o link do e-mail de novo ou peçam outro em <Link href="/entrar/recuperar">Esqueci minha senha</Link>.
        </p>
      )}
    </AuthShell>
  );
}
