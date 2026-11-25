"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResponderSolicitacaoButtons({ solicitacaoId }: { solicitacaoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"aprovar" | "recusar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function responder(aprovar: boolean) {
    setEnviando(aprovar ? "aprovar" : "recusar");
    setErro(null);

    // Via API, não direto no Supabase — a rota também avisa o
    // solicitante por WhatsApp (telefone dele e o token da Meta nunca
    // podem ir pro navegador).
    const resposta = await fetch("/api/solicitacoes-vinculo/responder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ solicitacao_id: solicitacaoId, aprovar }),
    });

    setEnviando(null);

    if (!resposta.ok) {
      setErro("Não foi possível responder. Atualize a página e tente de novo.");
      return;
    }

    // Avisa o Nav (componente separado, busca essa contagem sozinho no
    // client) pra atualizar o número de "Solicitações (N)" sem precisar
    // de reload — ver src/components/nav.tsx.
    window.dispatchEvent(new Event("rede-impulso:solicitacoes-atualizadas"));
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
