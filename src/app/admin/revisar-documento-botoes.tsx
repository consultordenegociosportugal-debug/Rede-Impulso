"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RevisarDocumentoBotoes({ documentoId }: { documentoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"aprovado" | "rejeitado" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function revisar(status: "aprovado" | "rejeitado") {
    setEnviando(status);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("revisar_documento", {
      p_documento_id: documentoId,
      p_novo_status: status,
    });

    setEnviando(null);

    if (error) {
      setErro("Não foi possível salvar. Tente de novo.");
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
          onClick={() => revisar("aprovado")}
          disabled={enviando !== null}
        >
          {enviando === "aprovado" ? "Aprovando…" : "Aprovar"}
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => revisar("rejeitado")}
          disabled={enviando !== null}
        >
          {enviando === "rejeitado" ? "Rejeitando…" : "Rejeitar"}
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
