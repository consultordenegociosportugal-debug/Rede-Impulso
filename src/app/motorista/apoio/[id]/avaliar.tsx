"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Uma avaliação por motorista por ponto (unique no banco): avaliar de
// novo substitui a anterior.
export function AvaliarPonto({
  pontoId,
  logado,
  notaAtual,
  comentarioAtual,
}: {
  pontoId: string;
  logado: boolean;
  notaAtual: number | null;
  comentarioAtual: string | null;
}) {
  const router = useRouter();
  const [nota, setNota] = useState(notaAtual ?? 0);
  const [comentario, setComentario] = useState(comentarioAtual ?? "");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  if (!logado) {
    return (
      <p className="hint" style={{ margin: "12px 0 0" }}>
        <Link href={`/entrar?depois=/motorista/apoio/${pontoId}`}>Entre</Link> para avaliar este ponto.
      </p>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nota < 1) {
      setMensagem("Escolha de 1 a 5 estrelas.");
      return;
    }
    setEnviando(true);
    setMensagem(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/entrar?depois=/motorista/apoio/${pontoId}`);
      return;
    }

    const { error } = await supabase.from("pontos_apoio_avaliacoes").upsert(
      {
        ponto_id: pontoId,
        autor_id: user.id,
        nota,
        comentario: comentario.trim() || null,
      },
      { onConflict: "ponto_id,autor_id" },
    );

    setEnviando(false);
    if (error) {
      setMensagem(`Erro ao salvar: ${error.message}`);
      return;
    }
    setMensagem("Obrigado! Sua avaliação ajuda outros motoristas.");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="mt-12">
      <div className="flex items-center gap-8" role="radiogroup" aria-label="Nota de 1 a 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => setNota(n)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 26,
              padding: 0,
              color: n <= nota ? "var(--amber)" : "var(--line)",
            }}
          >
            ★
          </button>
        ))}
        {notaAtual !== null && (
          <span className="hint" style={{ margin: 0 }}>
            (você já avaliou — enviar de novo atualiza)
          </span>
        )}
      </div>
      <textarea
        className="mt-8"
        placeholder="Como foi? Limpo, seguro, fila, preço… (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={500}
        rows={2}
        style={{ width: "100%" }}
      />
      <button type="submit" className="btn btn-primary btn-sm mt-8" disabled={enviando}>
        {enviando ? "Enviando…" : notaAtual !== null ? "Atualizar avaliação" : "Avaliar"}
      </button>
      {mensagem && (
        <p className="hint" style={{ margin: "8px 0 0" }}>
          {mensagem}
        </p>
      )}
    </form>
  );
}
