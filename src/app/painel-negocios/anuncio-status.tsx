"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Valores do enum `imovel_status` (migração 0001). Não inventamos status
// novo aqui — só transitamos entre os que o banco já aceita.
type StatusImovel =
  | "rascunho"
  | "publicado"
  | "em_negociacao"
  | "vendido"
  | "arquivado";

type Acao = { para: StatusImovel; label: string; classe: string; confirmar?: string };

const ACOES: Record<StatusImovel, Acao[]> = {
  rascunho: [{ para: "publicado", label: "Publicar", classe: "btn btn-primary btn-sm" }],
  publicado: [
    { para: "arquivado", label: "Pausar", classe: "btn btn-ghost btn-sm" },
    {
      para: "vendido",
      label: "Marcar vendido",
      classe: "btn btn-ghost btn-sm",
      confirmar:
        "Marcar este imóvel como vendido? Ele sai da vitrine pública, mas continua no seu painel.",
    },
  ],
  em_negociacao: [
    {
      para: "vendido",
      label: "Marcar vendido",
      classe: "btn btn-ghost btn-sm",
      confirmar:
        "Marcar este imóvel como vendido? Ele sai da vitrine pública, mas continua no seu painel.",
    },
  ],
  vendido: [{ para: "publicado", label: "Reabrir", classe: "btn btn-ghost btn-sm" }],
  arquivado: [
    { para: "publicado", label: "Republicar", classe: "btn btn-primary btn-sm" },
  ],
};

export function AnuncioStatus({
  imovelId,
  status,
}: {
  imovelId: string;
  status: string;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const acoes = ACOES[status as StatusImovel] ?? [];

  async function alterar(acao: Acao) {
    if (acao.confirmar && !window.confirm(acao.confirmar)) return;

    setSalvando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("imoveis")
      .update({ status: acao.para })
      .eq("id", imovelId);

    if (error) {
      setErro(error.message);
      setSalvando(false);
      return;
    }

    setSalvando(false);
    router.refresh();
  }

  if (acoes.length === 0) return null;

  return (
    <>
      <div className="flex gap-8">
        {acoes.map((acao) => (
          <button
            key={acao.para}
            type="button"
            className={acao.classe}
            onClick={() => alterar(acao)}
            disabled={salvando}
          >
            {salvando ? "…" : acao.label}
          </button>
        ))}
      </div>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)", margin: 0 }}>
          {erro}
        </p>
      )}
    </>
  );
}
