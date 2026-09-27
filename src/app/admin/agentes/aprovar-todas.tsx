"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Aprova de uma vez todas as sugestões pendentes de um agente — pensado
// para fontes oficiais com centenas de itens (postos de GNV da ANP).
export function AprovarTodas({ agenteId, total }: { agenteId: string; total: number }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function aprovar() {
    if (!confirm(`Aprovar as ${total} sugestões pendentes deste agente? Elas entram no app na hora.`)) return;
    setEnviando(true);
    setMensagem(null);
    const { data, error } = await createClient().rpc("aprovar_sugestoes_do_agente", { p_agente_id: agenteId });
    setEnviando(false);
    setMensagem(error ? `Erro: ${error.message}` : `${data} aprovadas.`);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <button type="button" className="btn btn-primary btn-sm" onClick={aprovar} disabled={enviando}>
        {enviando ? "Aprovando…" : `Aprovar todas (${total})`}
      </button>
      {mensagem && (
        <p className="hint" style={{ margin: "6px 0 0" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}
