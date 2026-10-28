import { Suspense } from "react";
import AuthShell from "./AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar · Eterna" };

export default function EntrarPage() {
  return (
    <AuthShell title="Bem-vindos à Eterna" lede="Entrem para criar o site, conversar com o estúdio e acompanhar o que os convidados enviam.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
