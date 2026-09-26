"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SugestaoBotoes({ sugestaoId }: { sugestaoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function revisar(funcao: "aplicar_sugestao_agente" | "rejeitar_sugestao_agente") {
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc(funcao, { p_sugestao_id: sugestaoId });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex gap-8">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => revisar("aplicar_sugestao_agente")}
          disabled={enviando}
        >
          Aprovar
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => revisar("rejeitar_sugestao_agente")}
          disabled={enviando}
        >
          Rejeitar
        </button>
      </div>
      {erro && (
        <p className="hint" style={{ margin: "8px 0 0", color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
