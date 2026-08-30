"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANOS = [
  { id: "5", limite: 5, valor: 139.9, label: "Profissional 5" },
  { id: "15", limite: 15, valor: 259.9, label: "Profissional 15", destaque: "Mais escolhido" },
  { id: "20", limite: 20, valor: 279.9, label: "Profissional 20" },
];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PlanosForm({ logado }: { logado: boolean }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function assinar(planoId: string) {
    if (!logado) {
      router.push(`/entrar?depois=/planos`);
      return;
    }

    setEnviando(planoId);
    setErro(null);

    try {
      const resposta = await fetch("/api/assinatura/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoId }),
      });
      const dados = await resposta.json();

      if (!resposta.ok || !dados.checkoutUrl) {
        setErro(dados.erro ?? "Não foi possível abrir a assinatura agora.");
        setEnviando(null);
        return;
      }

      // eslint-disable-next-line react-hooks/immutability -- redirecionamento pós-clique, não durante render
      window.location.href = dados.checkoutUrl;
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setEnviando(null);
    }
  }

  return (
    <div>
      <div className="grid grid-3" style={{ gap: 12 }}>
        {PLANOS.map((plano) => (
          <div
            key={plano.id}
            className="card"
            style={{
              textAlign: "center",
              borderColor: plano.destaque ? "var(--primary)" : undefined,
            }}
          >
            {plano.destaque && (
              <span className="badge badge-primary" style={{ marginBottom: 8 }}>
                {plano.destaque}
              </span>
            )}
            <div style={{ fontWeight: 600, fontSize: 16 }}>{plano.label}</div>
            <p className="hint" style={{ margin: "4px 0 8px" }}>
              até {plano.limite} imóveis ativos
            </p>
            <div className="mono" style={{ fontSize: 22 }}>
              {formatoMoeda.format(plano.valor)}
            </div>
            <p className="hint" style={{ margin: "2px 0 12px" }}>por mês</p>
            <button
              type="button"
              className="btn btn-primary btn-block btn-sm"
              onClick={() => assinar(plano.id)}
              disabled={enviando !== null}
            >
              {enviando === plano.id ? "Abrindo…" : "Assinar"}
            </button>
          </div>
        ))}
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 12, textAlign: "center" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
