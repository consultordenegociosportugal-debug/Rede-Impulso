"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botão "Marcar resolvido" dos lembretes no painel principal — mesma
// rota usada em NotasCliente (src/app/painel-negocios/clientes/).
// router.refresh() tira o lembrete da lista (a query do servidor já
// filtra lembrete_concluido_em is null).
export function LembreteAcao({ notaId }: { notaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function concluir() {
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/notas/${notaId}/concluir`, { method: "PATCH" });
      if (resposta.ok) router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={concluir} disabled={enviando}>
      {enviando ? "…" : "✓ Resolvido"}
    </button>
  );
}
