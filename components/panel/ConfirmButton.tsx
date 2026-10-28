"use client";

import { useEffect, useState } from "react";

/** Botão de exclusão em dois cliques: o primeiro pede confirmação, o segundo executa. */
export default function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  small,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  small?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`text-link danger${small ? " small" : ""}${armed ? " armed" : ""}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
