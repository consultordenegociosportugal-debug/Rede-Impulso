"use client";

import { useState } from "react";

export function MelhorarTexto({
  texto,
  onAplicar,
}: {
  texto: string;
  onAplicar: (novoTexto: string) => void;
}) {
  const [status, setStatus] = useState<"idle" | "carregando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [sugestao, setSugestao] = useState<string | null>(null);

  async function pedirSugestao() {
    if (!texto.trim()) return;
    setStatus("carregando");
    setErro(null);
    setSugestao(null);

    try {
      const resposta = await fetch("/api/texto/melhorar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const dados = await resposta.json();

      if (!resposta.ok || !dados.sugestao) {
        setErro(dados.erro ?? "Não consegui revisar o texto agora.");
        setStatus("erro");
        return;
      }

      setSugestao(dados.sugestao);
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
        onClick={pedirSugestao}
        disabled={status === "carregando" || !texto.trim()}
      >
        {status === "carregando" ? "Revisando…" : "✨ Corrigir e melhorar com IA"}
      </button>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: "6px 0 0" }}>
          {erro}
        </p>
      )}

      {sugestao && (
        <div className="card-flat mt-8" style={{ fontSize: 13.5 }}>
          <p className="hint" style={{ margin: "0 0 6px" }}>Sugestão:</p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{sugestao}</p>
          <div className="flex gap-8 mt-8">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                onAplicar(sugestao);
                setSugestao(null);
              }}
            >
              Usar esta versão
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSugestao(null)}
            >
              Manter o meu texto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
