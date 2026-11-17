"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Endereço chegou depois (migração 0093) — organizações já cadastradas
// antes dela ficaram sem endereço, e o formulário de cadastro não serve
// pra editar uma linha existente. Edição pontual só desse campo, sem
// virar um CRUD completo da organização.
export function EditarEnderecoOrganizacao({
  organizacaoId,
  enderecoAtual,
}: {
  organizacaoId: string;
  enderecoAtual: string | null;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [endereco, setEndereco] = useState(enderecoAtual ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("organizacoes_catalogo")
      .update({ endereco: endereco.trim() || null })
      .eq("id", organizacaoId);
    setSalvando(false);
    setEditando(false);
    router.refresh();
  }

  if (!editando) {
    return (
      <button
        type="button"
        className="hint"
        style={{ margin: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
        onClick={() => setEditando(true)}
      >
        {enderecoAtual ? `📍 ${enderecoAtual}` : "+ Adicionar endereço"}
      </button>
    );
  }

  return (
    <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
      <input
        type="text"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
        placeholder="Endereço da loja/escritório"
        style={{ minWidth: 220 }}
      />
      <button type="button" className="btn btn-primary btn-sm" onClick={salvar} disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(false)} disabled={salvando}>
        Cancelar
      </button>
    </div>
  );
}
