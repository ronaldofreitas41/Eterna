import Link from "next/link";
import AuthShell from "../AuthShell";
import ResetRequestForm from "./ResetRequestForm";

export const metadata = { title: "Recuperar senha · Eterna" };

export default function RecuperarPage() {
  return (
    <AuthShell title="Recuperar senha" lede="Informem o e-mail da conta. Enviaremos um link para criar uma nova senha." art={false}>
      <ResetRequestForm />
      <Link href="/entrar" className="text-link">
        Voltar para o login
      </Link>
    </AuthShell>
  );
}
