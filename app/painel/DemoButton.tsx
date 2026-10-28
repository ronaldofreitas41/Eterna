"use client";

import { useTransition } from "react";
import { createDemoWedding } from "./actions";

export default function DemoButton({ label = "Criar casamento de demonstração" }: { label?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn ghost" disabled={pending} onClick={() => start(() => createDemoWedding())}>
      {pending ? "Criando demonstração…" : label}
    </button>
  );
}
