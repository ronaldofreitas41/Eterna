import type { PhaseSetting, SitePhase } from "./types";

/** Data "AAAA-MM-DD" do banco como data local, sem deslocamento de fuso. */
export function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 864e5);
}

/** Fase exibida no site. Em "auto", segue a data: antes do dia, no dia, depois do dia. */
export function resolvePhase(setting: PhaseSetting, weddingDate: string | null, today = new Date()): SitePhase {
  if (setting !== "auto") return setting;
  const date = parseDate(weddingDate);
  if (!date) return "antes";
  const diff = daysBetween(today, date);
  if (diff > 0) return "antes";
  if (diff === 0) return "durante";
  return "depois";
}

export const PHASE_NAMES: Record<SitePhase, string> = {
  antes: "Antes · convite",
  durante: "Durante · ao vivo",
  depois: "Depois · memória",
};

export function formatLongDate(iso: string | null) {
  const d = parseDate(iso);
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}
