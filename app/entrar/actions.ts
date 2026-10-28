"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, hashPassword, newToken, normalizeEmail, sha256, validatePassword, verifyPassword } from "@/lib/auth";
import { one, pgCode, query, tx } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";

export type AuthState = { error?: string; info?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/painel");

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const user = await one<{ id: string; password_hash: string }>("select id, password_hash from users where email = $1", [email]);
  // Mesma mensagem para e-mail inexistente e senha errada, para não revelar quais contas existem.
  if (!user || !(await verifyPassword(password, user.password_hash))) return { error: "E-mail ou senha incorretos." };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Informe um e-mail válido." };
  const invalid = validatePassword(password);
  if (invalid) return { error: invalid };
  try {
    const user = await one<{ id: string }>("insert into users (email, password_hash) values ($1, $2) returning id", [email, await hashPassword(password)]);
    await createSession(user!.id);
  } catch (err) {
    if (pgCode(err) === "23505") return { error: "Já existe uma conta com este e-mail. Entrem ou recuperem a senha." };
    throw err;
  }
  redirect("/painel/novo");
}

export async function requestPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const user = await one<{ id: string }>("select id from users where email = $1", [email]);
  if (user) {
    const token = newToken();
    await query("insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')", [sha256(token), user.id]);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    await sendEmail(
      email,
      "Eterna · criar nova senha",
      `Recebemos um pedido para criar uma nova senha.\n\nAbra o link em até 1 hora:\n${proto}://${host}/entrar/nova-senha?token=${token}\n\nSe não foi você, ignore este e-mail.`,
    );
  }
  if (!isEmailConfigured())
    return {
      info:
        process.env.NODE_ENV === "production"
          ? "O envio de e-mails ainda não está configurado nesta instalação. Fale com o suporte."
          : "O envio de e-mails não está configurado. Em desenvolvimento, o link de recuperação aparece no terminal do servidor.",
    };
  return { info: "Se houver uma conta com esse e-mail, o link chega em alguns minutos. Confiram também o spam." };
}

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("confirm") ?? "")) return { error: "As senhas não são iguais." };
  const invalid = validatePassword(password);
  if (invalid) return { error: invalid };

  const userId = await tx(async (db) => {
    const reset = await one<{ user_id: string }>(
      "update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id",
      [sha256(token)],
      db,
    );
    if (!reset) return null;
    await query("update users set password_hash = $1 where id = $2", [await hashPassword(password), reset.user_id], db);
    // Encerra as sessões antigas: quem tinha a senha anterior perde o acesso.
    await query("delete from sessions where user_id = $1", [reset.user_id], db);
    return reset.user_id;
  });
  if (!userId) return { error: "O link expirou ou já foi usado. Peçam um novo em “Esqueci minha senha”." };
  await createSession(userId);
  redirect("/painel");
}
