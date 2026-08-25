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
  const [enviando, setEnviando] = useState(false);

  async function handleChange(status: string) {
    setEnviando(true);
    const supabase = createClient();
    await supabase.rpc("revisar_perfil", {
      p_profile_id: profileId,
      p_novo_status: status,
    });
    setEnviando(false);
    router.refresh();
  }

  return (
    <select
      defaultValue={statusAtual}
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
  );
}
