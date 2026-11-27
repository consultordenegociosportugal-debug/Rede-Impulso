"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botão "Marcar como lida" das mensagens de cliente no painel
// principal (ver migração 0102, src/app/api/webhooks/whatsapp/route.ts).
// router.refresh() tira a mensagem da lista (a query do servidor já
// filtra lida_em is null). Mesmo padrão de LembreteAcao.
export function MensagemClienteAcao({ mensagemId }: { mensagemId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function marcarLida() {
    setEnviando(true);
    try {
      const resposta = await fetch(`/api/mensagens-cliente/${mensagemId}/marcar-lida`, {
        method: "PATCH",
      });
      if (resposta.ok) router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={marcarLida} disabled={enviando}>
      {enviando ? "…" : "✓ Lida"}
    </button>
  );
}
