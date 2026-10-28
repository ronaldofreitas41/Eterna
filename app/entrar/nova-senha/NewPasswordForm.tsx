"use client";

import { useActionState } from "react";
import { resetPassword, type AuthState } from "../actions";

export default function NewPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  return (
    <form className="form" action={action}>
      <input type="hidden" name="token" value={token} />
      <label className="field">
        <span>Nova senha</span>
        <input id="new-password" name="password" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
      </label>
      <label className="field">
        <span>Repitam a senha</span>
        <input id="new-password-confirm" name="confirm" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
      </label>
      <button className="btn primary" disabled={pending}>
        {pending ? "Salvando…" : "Salvar senha"}
      </button>
      {state.error && (
        <p className="notice" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
