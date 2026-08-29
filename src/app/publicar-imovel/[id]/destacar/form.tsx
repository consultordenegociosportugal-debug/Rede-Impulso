"use client";

import { useState } from "react";

const PLANOS = [
  { dias: 7, valor: 19.9, label: "7 dias" },
  { dias: 15, valor: 34.9, label: "15 dias", destaque: "Mais escolhido" },
  { dias: 30, valor: 59.9, label: "30 dias" },
];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function DestacarForm({ imovelId }: { imovelId: string }) {
  const [selecionado, setSelecionado] = useState(15);
  const [status, setStatus] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleComprar() {
    setStatus("enviando");
    setErro(null);

    try {
      const resposta = await fetch("/api/destaque/criar-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imovelId, dias: selecionado }),
      });
      const dados = await resposta.json();

      if (!resposta.ok || !dados.checkoutUrl) {
        setErro(dados.erro ?? "Não foi possível abrir o pagamento agora.");
        setStatus("erro");
        return;
      }

      window.location.href = dados.checkoutUrl;
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("erro");
    }
  }

  return (
    <div className="card mt-24">
      <p style={{ fontWeight: 600, marginBottom: 12 }}>Escolha o período</p>
      <div className="grid grid-3" style={{ gap: 10 }}>
        {PLANOS.map((plano) => (
          <label
            key={plano.dias}
            className="card-flat"
            style={{
              cursor: "pointer",
              textAlign: "center",
              borderColor: selecionado === plano.dias ? "var(--primary)" : undefined,
              background: selecionado === plano.dias ? "var(--primary-tint)" : undefined,
            }}
          >
            <input
              type="radio"
              name="plano"
              value={plano.dias}
              checked={selecionado === plano.dias}
              onChange={() => setSelecionado(plano.dias)}
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                margin: 0,
                padding: 0,
                border: 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                clipPath: "inset(50%)",
              }}
            />
            {plano.destaque && (
              <div className="hint mono" style={{ marginBottom: 4 }}>
                {plano.destaque}
              </div>
            )}
            <div style={{ fontWeight: 600 }}>{plano.label}</div>
            <div className="mono" style={{ fontSize: 15, marginTop: 4 }}>
              {formatoMoeda.format(plano.valor)}
            </div>
          </label>
        ))}
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 12 }}>
          {erro}
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block mt-16"
        onClick={handleComprar}
        disabled={status === "enviando"}
      >
        {status === "enviando" ? "Abrindo pagamento…" : "Pagar com Mercado Pago"}
      </button>
      <p className="hint" style={{ textAlign: "center", marginTop: 8, marginBottom: 0 }}>
        Você será redirecionado para o checkout seguro do Mercado Pago.
      </p>
    </div>
  );
}
