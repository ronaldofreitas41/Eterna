import "server-only";

// Envio de e-mail pela API da Resend, quando configurada (RESEND_API_KEY e EMAIL_FROM).
// Sem configuração, nada é enviado: em desenvolvimento o conteúdo vai para o terminal do servidor.

export const isEmailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") console.info(`[e-mail não configurado] Para: ${to}\nAssunto: ${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
  });
  if (!res.ok) console.error("[e-mail] falha no envio", res.status, await res.text().catch(() => ""));
  return res.ok;
}
