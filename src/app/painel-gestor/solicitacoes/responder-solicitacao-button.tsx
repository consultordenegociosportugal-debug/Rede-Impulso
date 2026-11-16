"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ResponderSolicitacaoButtons({ solicitacaoId }: { solicitacaoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"aprovar" | "recusar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function responder(aprovar: boolean) {
    setEnviando(aprovar ? "aprovar" : "recusar");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("responder_solicitacao_vinculo", {
      p_solicitacao_id: solicitacaoId,
      p_aprovar: aprovar,
    });

    setEnviando(null);

    if (error) {
      setErro("Não foi possível responder. Atualize a página e tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <div style={{ textAlign: "right" }}>
      <div className="flex gap-8">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={enviando !== null}
          onClick={() => responder(false)}
        >
          {enviando === "recusar" ? "Recusando…" : "Recusar"}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={enviando !== null}
          onClick={() => responder(true)}
        >
          {enviando === "aprovar" ? "Aprovando…" : "Aprovar"}
        </button>
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: "4px 0 0" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
