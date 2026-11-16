"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Material = { id: string; titulo: string; arquivo_url: string };

// Bucket privado — gera um signed URL na hora do clique (expira em
// minutos) em vez de guardar/mostrar uma URL permanente.
export function MateriaisLista({ materiais }: { materiais: Material[] }) {
  const [abrindo, setAbrindo] = useState<string | null>(null);

  async function abrir(material: Material) {
    setAbrindo(material.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("curso-materiais")
      .createSignedUrl(material.arquivo_url, 300);
    setAbrindo(null);
    if (!error && data) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (materiais.length === 0) {
    return <p className="muted" style={{ fontSize: 13.5 }}>Nenhum material disponível ainda.</p>;
  }

  return (
    <div>
      {materiais.map((m) => (
        <div key={m.id} className="list-row">
          <div className="flex between items-center" style={{ width: "100%" }}>
            <span style={{ fontSize: 14 }}>📄 {m.titulo}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => abrir(m)}
              disabled={abrindo === m.id}
            >
              {abrindo === m.id ? "…" : "Abrir"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
