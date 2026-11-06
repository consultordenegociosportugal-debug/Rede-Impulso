"use client";

import { useState } from "react";

// Antes só aparecia dentro do aviso de agenda vazia — assim que o
// corretor tinha a primeira visita marcada, o card sumia e ele perdia
// o único lugar onde via o próprio link. Agora fica sempre visível
// aqui, com botão de copiar.
export function LinkPerfilPublico({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard bloqueado (permissão, contexto não seguro etc.) — o
      // corretor ainda pode selecionar e copiar o texto manualmente.
    }
  }

  return (
    <div
      className="card-flat flex items-center gap-8 mb-24"
      style={{ flexWrap: "wrap", justifyContent: "space-between" }}
    >
      <p className="hint" style={{ margin: 0 }}>
        Seu link para clientes agendarem direto com você:{" "}
        <a href={link} style={{ wordBreak: "break-all" }}>
          {link}
        </a>
      </p>
      <button type="button" className="btn btn-outline btn-sm" onClick={copiar}>
        {copiado ? "Copiado!" : "📋 Copiar link"}
      </button>
    </div>
  );
}
