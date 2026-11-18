"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      // Via API route (não supabase.from direto): precisa geocodificar o
      // endereço (lat/lng) pra distância no link público funcionar — e
      // isso só roda no servidor (migração 0097, src/lib/geocodificar.ts).
      const resposta = await fetch("/api/admin/organizacoes/salvar-endereco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizacaoId, endereco }),
      });
      const dados = (await resposta.json()) as { erro?: string; aviso?: string | null };

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível salvar o endereço.");
        return;
      }

      setEditando(false);
      setAviso(dados.aviso ?? null);
      router.refresh();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <div>
        <button
          type="button"
          className="hint"
          style={{ margin: 0, background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline", textAlign: "left" }}
          onClick={() => setEditando(true)}
        >
          {enderecoAtual ? `📍 ${enderecoAtual}` : "+ Adicionar endereço"}
        </button>
        {aviso && (
          <p className="hint" style={{ color: "var(--amber)", margin: "4px 0 0" }}>
            ⚠️ {aviso}
          </p>
        )}
      </div>
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
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => {
          setEditando(false);
          setErro(null);
        }}
        disabled={salvando}
      >
        Cancelar
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", width: "100%", margin: "4px 0 0" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
