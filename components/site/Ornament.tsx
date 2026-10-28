import type { Theme } from "@/lib/theme";

// Ornamentos do site, desenhados com a cor de destaque do tema.
export default function Ornament({ kind, large }: { kind: Theme["ornament"]; large?: boolean }) {
  if (kind === "none") return null;
  if (kind === "line") return <span className="s-orn-line" aria-hidden="true" />;

  if (kind === "florals")
    return (
      <svg className={large ? "s-orn-large" : "s-orn"} viewBox="0 0 160 40" aria-hidden="true">
        <path d="M10 20 H150" stroke="var(--s-accent)" strokeWidth=".8" opacity=".45" fill="none" />
        {[34, 80, 126].map((x, i) => (
          <g key={x} transform={`translate(${x} 20) scale(${i === 1 ? 1.25 : 0.85})`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-6" rx="3.4" ry="6" transform={`rotate(${a})`} fill="var(--s-accent)" opacity=".38" />
            ))}
            <circle r="2.4" fill="var(--s-accent)" opacity=".8" />
          </g>
        ))}
        {[56, 104].map((x) => (
          <ellipse key={x} cx={x} cy="20" rx="7" ry="2.4" fill="var(--s-accent)" opacity=".3" />
        ))}
      </svg>
    );

  // Folhagens: um ramo com folhas alternadas.
  return (
    <svg className={large ? "s-orn-large" : "s-orn"} viewBox="0 0 160 40" aria-hidden="true">
      <path d="M8 22 C50 18 110 26 152 20" stroke="var(--s-accent)" strokeWidth="1" fill="none" opacity=".6" />
      {[22, 40, 58, 76, 94, 112, 130].map((x, i) => {
        const up = i % 2 === 0;
        const y = up ? 15 : 27;
        return (
          <ellipse
            key={x}
            cx={x}
            cy={y}
            rx="9"
            ry="3.4"
            transform={`rotate(${up ? -28 : 28} ${x} ${y})`}
            fill="var(--s-accent)"
            opacity={0.35 + (i % 3) * 0.12}
          />
        );
      })}
    </svg>
  );
}
