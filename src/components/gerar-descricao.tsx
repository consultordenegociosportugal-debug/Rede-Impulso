"use client";

import { useState } from "react";

type DadosImovel = {
  finalidade?: string;
  tipo?: string;
  bairro?: string;
  cidade?: string;
  quartos?: number;
  banheiros?: number;
  vagas?: number;
  areaM2?: number;
  comodidades?: string[];
  preco?: number;
};

export function GerarDescricao({
  dados,
  onAplicar,
}: {
  dados: DadosImovel;
  onAplicar: (texto: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "carregando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function gerar() {
    setStatus("carregando");
    setErro(null);

    try {
      const resposta = await fetch("/api/texto/gerar-descricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const resultado = await resposta.json();

      if (!resposta.ok || !resultado.descricao) {
        setErro(resultado.erro ?? "Não consegui gerar a descrição agora.");
        setStatus("erro");
        return;
      }

      onAplicar(resultado.descricao);
      setStatus("idle");
    } catch {
      setErro("Sem conexão no momento.");
      setStatus("erro");
    }
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={gerar}
        disabled={status === "carregando"}
      >
        {status === "carregando" ? "Gerando…" : "✨ Gerar descrição com IA"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: "6px 0 0" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
