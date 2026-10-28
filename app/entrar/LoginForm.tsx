"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthState } from "./actions";

export default function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"entrar" | "criar">(params.get("modo") === "criar" ? "criar" : "entrar");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(signIn, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signUp, {});
  const state = mode === "entrar" ? loginState : signupState;
  const pending = loginPending || signupPending;

  return (
    <form className="form" action={mode === "entrar" ? loginAction : signupAction}>
      <div className="seg wide" role="group" aria-label="Acesso">
        <button type="button" aria-pressed={mode === "entrar"} onClick={() => setMode("entrar")}>
          Já temos conta
        </button>
        <button type="button" aria-pressed={mode === "criar"} onClick={() => setMode("criar")}>
          Criar conta
        </button>
      </div>
      <input type="hidden" name="next" value={params.get("next") ?? "/painel"} />
      <label className="field">
        <span>E-mail</span>
        <input id="login-email" name="email" type="email" required autoComplete="email" maxLength={254} />
      </label>
      <label className="field">
        <span>Senha</span>
        <input id="login-password" name="password" type="password" required minLength={8} maxLength={200} autoComplete={mode === "entrar" ? "current-password" : "new-password"} />
        {mode === "criar" && <small>Pelo menos 8 caracteres.</small>}
      </label>
      <button className="btn primary" disabled={pending}>
        {pending ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
      </button>
      {mode === "entrar" && (
        <Link href="/entrar/recuperar" className="text-link">
          Esqueci minha senha
        </Link>
      )}
      {state.error && (
        <p className="notice" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
