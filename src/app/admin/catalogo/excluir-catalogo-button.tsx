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
    // Organização carrega consequência real: tira o papel de gestor de
    // quem estiver vinculado a ela (gestor_perfis é cascade — sem org,
    // não tem papel de gestor) e some da lista de filtro de ninguém
    // mais poder escolher pra novo vínculo. O histórico de leads
    // continua existindo (migração 0091 trocou pra on delete set
    // null), mas vale deixar claro o que realmente é apagado.
    const aviso =
      tabela === "organizacoes_catalogo"
        ? "Excluir esta organização? Quem for gestor dela perde esse papel imediatamente. O histórico de leads e vendas é preservado, mas fica sem organização associada."
        : "Excluir este item do catálogo?";
    if (!confirm(aviso)) return;
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
