"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Desativar em vez de excluir — um curso pode já ter matrículas, e
// apagar a linha apagaria o histórico delas junto (curso_id em cascata).
export function AlternarAtivoButton({ cursoId, ativo }: { cursoId: string; ativo: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function alternar() {
    setEnviando(true);
    const supabase = createClient();
    await supabase.from("cursos").update({ ativo: !ativo }).eq("id", cursoId);
    setEnviando(false);
    router.refresh();
  }

  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={alternar} disabled={enviando}>
      {enviando ? "…" : ativo ? "Desativar" : "Ativar"}
    </button>
  );
}
