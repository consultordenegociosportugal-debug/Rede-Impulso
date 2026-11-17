"use client";

import { useState } from "react";

export function CopiarLinkConviteBotao({ organizacaoId }: { organizacaoId: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const link = `${window.location.origin}/cadastro-gestor?org=${organizacaoId}`;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button type="button" className="btn btn-outline btn-sm" onClick={copiar}>
      {copiado ? "Copiado!" : "Copiar link de convite"}
    </button>
  );
}
