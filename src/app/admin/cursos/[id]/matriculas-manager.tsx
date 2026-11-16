"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Matricula = {
  id: string;
  status: string;
  valor: number;
  profiles: { nome: string; email: string | null } | null;
};

const STATUS_OPCOES = [
  { value: "pendente_pagamento", label: "Pagamento pendente" },
  { value: "pago", label: "Pago" },
  { value: "concluido", label: "Concluído (libera certificado)" },
  { value: "cancelado", label: "Cancelado" },
];

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MatriculasManager({ matriculas }: { matriculas: Matricula[] }) {
  const router = useRouter();
  const [alterando, setAlterando] = useState<string | null>(null);

  async function mudarStatus(id: string, status: string) {
    setAlterando(id);
    const supabase = createClient();
    await supabase.from("matriculas").update({ status }).eq("id", id);
    setAlterando(null);
    router.refresh();
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>
        Matrículas{matriculas.length > 0 ? ` (${matriculas.length})` : ""}
      </h2>
      {matriculas.length === 0 ? (
        <p className="muted" style={{ fontSize: 13.5 }}>Ninguém se matriculou ainda.</p>
      ) : (
        matriculas.map((m) => (
          <div key={m.id} className="list-row">
            <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.profiles?.nome ?? "—"}</div>
                <div className="hint" style={{ margin: 0 }}>
                  {m.profiles?.email ?? ""} · {formatoMoeda.format(m.valor)}
                </div>
              </div>
              <select
                value={m.status}
                onChange={(e) => mudarStatus(m.id, e.target.value)}
                disabled={alterando === m.id}
                style={{ width: 220 }}
              >
                {STATUS_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
