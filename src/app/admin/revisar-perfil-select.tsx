"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OPCOES = ["pendente", "em_analise", "aprovado", "rejeitado"] as const;

export function RevisarPerfilSelect({
  profileId,
  statusAtual,
}: {
  profileId: string;
  statusAtual: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(statusAtual);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleChange(novoStatus: string) {
    const statusAnterior = status;
    setStatus(novoStatus);
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("revisar_perfil", {
      p_profile_id: profileId,
      p_novo_status: novoStatus,
    });

    setEnviando(false);

    // Sem isto, um RPC que falhasse (sessão expirada, is_admin() virou
    // falso no meio da ação) deixava o select mostrando o valor escolhido
    // mesmo sem nada ter sido salvo no banco — nenhum jeito de notar o erro.
    if (error) {
      setStatus(statusAnterior);
      setErro("Não foi possível salvar. Tente de novo.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <select
        value={status}
        disabled={enviando}
        onChange={(e) => handleChange(e.target.value)}
        style={{ width: "auto" }}
      >
        {OPCOES.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: "4px 0 0" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
