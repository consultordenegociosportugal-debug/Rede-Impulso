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
    await supabase.from(tabela).delete().eq("id", id);
    setExcluindo(false);
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
