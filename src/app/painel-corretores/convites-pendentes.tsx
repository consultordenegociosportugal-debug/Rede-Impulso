"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export type ConvitePendente = { id: string; email: string; created_at: string };

export function ConvitesPendentes({ convites }: { convites: ConvitePendente[] }) {
  const router = useRouter();
  const [cancelando, setCancelando] = useState<string | null>(null);

  if (convites.length === 0) return null;

  async function handleCancelar(id: string) {
    setCancelando(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("convites_equipe")
      .update({ status: "cancelado", respondido_em: new Date().toISOString() })
      .eq("id", id);
    setCancelando(null);
    if (!error) router.refresh();
  }

  return (
    <div className="mb-24">
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Convites pendentes</h2>
      <div className="card" style={{ padding: "8px 20px" }}>
        {convites.map((c) => (
          <div key={c.id} className="list-row">
            <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.email}</div>
                <div className="hint" style={{ margin: 0 }}>
                  Enviado em {formatoData.format(new Date(c.created_at))}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => handleCancelar(c.id)}
                disabled={cancelando === c.id}
              >
                {cancelando === c.id ? "Cancelando…" : "Cancelar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
