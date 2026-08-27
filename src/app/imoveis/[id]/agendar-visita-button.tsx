"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "abrindo" | "enviando" | "sucesso";

export function AgendarVisitaButton({
  imovelId,
  logado,
}: {
  imovelId: string;
  logado: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [dataHora, setDataHora] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function abrir() {
    if (!logado) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }
    setStatus("abrindo");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const quando = new Date(dataHora);
    if (Number.isNaN(quando.getTime())) {
      setErro("Escolha uma data e um horário válidos.");
      return;
    }
    if (quando.getTime() <= Date.now()) {
      setErro("Escolha uma data no futuro.");
      return;
    }

    setStatus("enviando");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/imoveis/${imovelId}`);
      return;
    }

    // `corretor_id` não vai no insert: um trigger no banco define o
    // responsável (corretor vinculado ao imóvel ou o vendedor).
    const { error } = await supabase.from("visitas").insert({
      imovel_id: imovelId,
      comprador_id: user.id,
      data_hora: quando.toISOString(),
      observacoes: observacoes.trim() || null,
    });

    if (error) {
      setErro(error.message);
      setStatus("abrindo");
      return;
    }

    setStatus("sucesso");
  }

  if (status === "sucesso") {
    return (
      <div className="card-flat" style={{ textAlign: "center" }}>
        <span className="badge badge-primary">Visita solicitada</span>
        <p className="hint" style={{ marginBottom: 0 }}>
          O responsável pelo imóvel recebeu seu pedido e vai confirmar o
          horário. Acompanhe pelo painel de negócios.
        </p>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <button type="button" className="btn btn-outline btn-block" onClick={abrir}>
        📅 Agendar visita
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="visita-data">Quando você quer visitar?</label>
        <input
          type="datetime-local"
          id="visita-data"
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="visita-obs">Observações (opcional)</label>
        <textarea
          id="visita-obs"
          rows={2}
          placeholder="Ex.: prefiro no fim da tarde, posso remarcar se precisar."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <div className="flex gap-8">
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={status === "enviando"}
        >
          {status === "enviando" ? "Enviando…" : "Pedir visita"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStatus("idle")}
          disabled={status === "enviando"}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
