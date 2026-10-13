"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUS_OPCOES = [
  { valor: "em_analise", label: "Em análise" },
  { valor: "procedente", label: "Procedente — conteúdo removido" },
  { valor: "improcedente", label: "Improcedente" },
] as const;

export function RevisarDireitosAutoraisForm({
  id,
  statusAtual,
  respostaAtual,
}: {
  id: string;
  statusAtual: string;
  respostaAtual: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(statusAtual === "pendente" ? "em_analise" : statusAtual);
  const [resposta, setResposta] = useState(respostaAtual ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    setEnviando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("revisar_denuncia_direitos_autorais", {
      p_id: id,
      p_novo_status: status,
      p_resposta: resposta.trim() || null,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="card-flat mt-8">
      <div className="field">
        <label htmlFor={`status-${id}`}>Status</label>
        <select id={`status-${id}`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPCOES.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`resposta-${id}`}>
          Nota interna{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            (opcional)
          </span>
        </label>
        <textarea
          id={`resposta-${id}`}
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={2}
          placeholder="O que foi feito, ex: imóvel arquivado em 10/10."
        />
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleSalvar}
        disabled={enviando}
      >
        {enviando ? "Salvando…" : "Salvar revisão"}
      </button>
    </div>
  );
}
