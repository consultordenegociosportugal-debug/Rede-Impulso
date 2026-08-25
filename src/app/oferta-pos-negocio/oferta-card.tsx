"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const ICONS: Record<string, string> = {
  Pintor: "🎨",
  Eletricista: "💡",
  Encanador: "🔧",
  "Instalacao de ar-condicionado": "❄️",
  Consorcio: "💰",
};

export function OfertaCard({
  negocioId,
  parceiroId,
  nome,
  desc,
  jaSolicitado,
  amber,
}: {
  negocioId: string;
  parceiroId: string;
  nome: string;
  desc: string;
  jaSolicitado: boolean;
  amber?: boolean;
}) {
  const [solicitado, setSolicitado] = useState(jaSolicitado);
  const [enviando, setEnviando] = useState(false);

  async function handleClick() {
    if (solicitado || enviando) return;
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.from("ofertas_pos_negocio").insert({
      negocio_id: negocioId,
      parceiro_id: parceiroId,
      categoria: nome,
    });
    setEnviando(false);
    if (!error) setSolicitado(true);
  }

  return (
    <div className={`card ${styles.offerCard}`}>
      <div
        className={styles.offerIc}
        style={amber ? { background: "var(--amber-tint)" } : undefined}
      >
        {ICONS[nome] ?? "🔧"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{nome}</div>
        <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
          {desc}
        </p>
      </div>
      <button
        type="button"
        className={solicitado ? "btn btn-ghost btn-sm" : "btn btn-outline btn-sm"}
        onClick={handleClick}
        disabled={solicitado || enviando}
      >
        {solicitado ? "Solicitado ✓" : enviando ? "Enviando…" : "Solicitar"}
      </button>
    </div>
  );
}
