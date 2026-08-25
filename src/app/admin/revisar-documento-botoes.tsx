"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RevisarDocumentoBotoes({ documentoId }: { documentoId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function revisar(status: "aprovado" | "rejeitado") {
    setEnviando(true);
    const supabase = createClient();
    await supabase.rpc("revisar_documento", {
      p_documento_id: documentoId,
      p_novo_status: status,
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="flex gap-8">
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={() => revisar("aprovado")}
        disabled={enviando}
      >
        Aprovar
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => revisar("rejeitado")}
        disabled={enviando}
      >
        Rejeitar
      </button>
    </div>
  );
}
