"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ExcluirCatalogoButton({
  tabela,
  id,
}: {
  tabela: "cidades_catalogo" | "organizacoes_catalogo";
  id: string;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    if (!confirm("Excluir este item do catálogo?")) return;
    setExcluindo(true);
    const supabase = createClient();
    const { error } = await supabase.from(tabela).delete().eq("id", id);
    setExcluindo(false);
    if (error) {
      // Sem isto, um delete barrado (ex.: cidade ainda referenciada por
      // uma organização) não dava nenhum feedback — a tela só atualizava
      // e o item continuava lá, sem explicação do motivo.
      alert(
        error.code === "23503"
          ? "Não dá para excluir: ainda existe algo vinculado a este item."
          : "Não foi possível excluir.",
      );
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={excluir}
      disabled={excluindo}
      style={{ color: "var(--coral)" }}
    >
      {excluindo ? "…" : "Excluir"}
    </button>
  );
}
