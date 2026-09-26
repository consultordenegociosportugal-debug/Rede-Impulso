"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  agenteId: string;
  modo: "aprovacao" | "autonomo";
  ativo: boolean;
};

export function AgenteControles({ agenteId, modo, ativo }: Props) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function atualizar(campos: { modo?: string; ativo?: boolean }) {
    if (campos.modo === "autonomo" && !confirm("No modo autônomo o agente aplica as mudanças sem pedir aprovação. Continuar?")) {
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    await supabase.from("ev_agentes").update(campos).eq("id", agenteId);
    setSalvando(false);
    router.refresh();
  }

  async function executarAgora() {
    setExecutando(true);
    setMensagem("Pesquisando… isso pode levar alguns minutos.");
    const resposta = await fetch(`/api/agentes-eletricos/executar?agente=${agenteId}`);
    const corpo = await resposta.json().catch(() => ({}));
    setMensagem(
      resposta.ok
        ? corpo.pulado
          ? `Pulado: ${corpo.pulado}.`
          : `Pronto: ${corpo.sugestoes} sugestões${corpo.aplicadas ? `, ${corpo.aplicadas} aplicadas` : ""}.`
        : `Erro: ${corpo.erro ?? resposta.statusText}`,
    );
    setExecutando(false);
    router.refresh();
  }

  return (
    <div className="mt-16">
      <div className="flex items-center gap-8" style={{ flexWrap: "wrap" }}>
        <select
          style={{ width: "auto" }}
          value={modo}
          disabled={salvando}
          onChange={(e) => atualizar({ modo: e.target.value })}
        >
          <option value="aprovacao">Pede aprovação</option>
          <option value="autonomo">Autônomo</option>
        </select>
        <label className="hint flex items-center gap-8" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={ativo}
            disabled={salvando}
            onChange={(e) => atualizar({ ativo: e.target.checked })}
          />
          Ativo
        </label>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={executarAgora}
          disabled={executando || !ativo}
        >
          {executando ? "Executando…" : "Executar agora"}
        </button>
      </div>
      {mensagem && (
        <p className="hint" style={{ margin: "8px 0 0" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}
