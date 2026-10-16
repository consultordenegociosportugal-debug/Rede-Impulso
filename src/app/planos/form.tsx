"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLANOS_PROFISSIONAL,
  CICLOS,
  valorMensalComDesconto,
  type CicloCobranca,
} from "@/lib/mercadopago";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function PlanosForm({ logado }: { logado: boolean }) {
  const router = useRouter();
  const [ciclo, setCiclo] = useState<CicloCobranca>("anual");
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
        body: JSON.stringify({ plano: planoId, ciclo }),
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

  const config = CICLOS.find((c) => c.id === ciclo)!;

  return (
    <div>
      <div className="segmented" style={{ maxWidth: 360, margin: "0 auto 20px" }}>
        {CICLOS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === ciclo ? "active" : undefined}
            onClick={() => setCiclo(c.id)}
          >
            {c.label}
            {c.desconto > 0 ? ` -${Math.round(c.desconto * 100)}%` : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-3" style={{ gap: 12 }}>
        {PLANOS_PROFISSIONAL.map((plano) => {
          const valorMensal = valorMensalComDesconto(plano, ciclo);
          const valorTotal = Math.round(valorMensal * config.meses * 100) / 100;
          return (
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
              <p className="hint" style={{ margin: "4px 0 8px" }}>{plano.equipeLabel}</p>

              {config.desconto > 0 && (
                <div className="hint mono" style={{ textDecoration: "line-through" }}>
                  {formatoMoeda.format(plano.valorMensalCheio)}
                </div>
              )}
              <div className="mono" style={{ fontSize: 22 }}>
                {formatoMoeda.format(valorMensal)}
              </div>
              <p className="hint" style={{ margin: "2px 0 4px" }}>por mês</p>
              {config.meses > 1 && (
                <p className="hint" style={{ margin: "0 0 8px", fontSize: 11.5 }}>
                  Total {formatoMoeda.format(valorTotal)}, cobrado a cada {config.meses} meses
                </p>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block btn-sm mt-8"
                onClick={() => assinar(plano.id)}
                disabled={enviando !== null}
              >
                {enviando === plano.id ? "Abrindo…" : "Assinar"}
              </button>
              <p className="hint" style={{ margin: "8px 0 0", fontSize: 11.5, lineHeight: 1.4 }}>
                Até {plano.limiteImoveis} imóveis ativos na equipe. Cancele quando quiser, sem
                multa.
              </p>
            </div>
          );
        })}
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 12, textAlign: "center" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
