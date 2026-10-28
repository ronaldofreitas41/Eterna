"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../actions";

export default function ResetRequestForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  if (state.info)
    return (
      <p className="notice ok" role="status">
        {state.info}
      </p>
    );
  return (
    <form className="form" action={action}>
      <label className="field">
        <span>E-mail</span>
        <input id="reset-email" name="email" type="email" required autoComplete="email" maxLength={254} />
      </label>
      <button className="btn primary" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
