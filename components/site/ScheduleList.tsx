"use client";

import { useEffect, useState } from "react";
import { formatLongDate } from "@/lib/phase";
import type { SiteSchedule } from "@/lib/site";

const hhmm = (t: string) => t.slice(0, 5);

/** Programação agrupada por dia. Durante o evento, destaca o item atual pelo relógio do convidado. */
export default function ScheduleList({ items, live }: { items: SiteSchedule[]; live: boolean }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    if (!live) return;
    const tick = () => setNow(new Date().toTimeString().slice(0, 5));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [live]);

  const days = new Map<string, SiteSchedule[]>();
  for (const i of [...items].sort((a, b) => (a.day ?? "").localeCompare(b.day ?? "") || a.starts_at.localeCompare(b.starts_at)))
    days.set(i.day ?? "", [...(days.get(i.day ?? "") ?? []), i]);

  const singleDay = days.size === 1;
  const firstDay = [...days.values()][0] ?? [];
  const currentId = now && singleDay ? firstDay.filter((i) => hhmm(i.starts_at) <= now).at(-1)?.id : undefined;

  return (
    <div className="s-days">
      {[...days.entries()].map(([day, list]) => (
        <div key={day || "sem-dia"}>
          {!singleDay && day && <h3 className="s-day">{formatLongDate(day)}</h3>}
          <ol className="s-schedule">
            {list.map((i) => (
              <li key={i.id} className={i.id === currentId ? "now" : undefined}>
                <time>{hhmm(i.starts_at).replace(":", "h")}</time>
                <div>
                  <strong>{i.title}</strong>
                  {i.id === currentId && <span className="s-now">agora</span>}
                  {i.location && <span className="s-muted"> · {i.location}</span>}
                  {i.description && <p>{i.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
