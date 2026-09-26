"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type StatusVeiculo = "publicado" | "reservado" | "vendido" | "arquivado";

const OPCOES: { value: StatusVeiculo; label: string }[] = [
  { value: "publicado", label: "Publicado" },
  { value: "reservado", label: "Reservado" },
  { value: "vendido", label: "Vendido" },
  { value: "arquivado", label: "Arquivado" },
];

export function StatusVeiculo({ veiculoId, statusAtual }: { veiculoId: string; statusAtual: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function alterar(status: StatusVeiculo) {
    if (status === statusAtual) return;
    setEnviando(true);
    const supabase = createClient();
    await supabase.from("ev_veiculos").update({ status }).eq("id", veiculoId);
    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
      {OPCOES.map((op) => (
        <button
          key={op.value}
          type="button"
          className={op.value === statusAtual ? "badge badge-primary" : "badge badge-outline"}
          style={{ cursor: "pointer", border: "none" }}
          disabled={enviando}
          onClick={() => alterar(op.value)}
        >
          {op.label}
        </button>
      ))}
    </div>
  );
}
