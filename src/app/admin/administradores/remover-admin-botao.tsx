"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RemoverAdminBotao({
  profileId,
  ehVoceMesmo,
}: {
  profileId: string;
  ehVoceMesmo: boolean;
}) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function remover() {
    const confirmado = window.confirm(
      ehVoceMesmo
        ? "Remover seu próprio acesso de admin? Você perde o acesso a esta tela na hora."
        : "Remover o acesso de admin dessa pessoa?",
    );
    if (!confirmado) return;

    setRemovendo(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("definir_admin", { p_profile_id: profileId, p_admin: false });

    setRemovendo(false);

    if (error) {
      setErro(error.message.includes("último administrador") ? "Não dá pra remover o último admin." : "Não foi possível remover.");
      return;
    }

    router.refresh();
  }

  return (
    <div style={{ textAlign: "right" }}>
      <button type="button" className="btn btn-outline btn-sm" disabled={removendo} onClick={remover}>
        {removendo ? "Removendo…" : "Remover admin"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: "4px 0 0" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
