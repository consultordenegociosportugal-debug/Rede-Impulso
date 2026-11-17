"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function MatriculaBotao({
  cursoId,
  matriculaExistente,
  matriculaStatusInicial,
}: {
  cursoId: string;
  matriculaExistente: string | null;
  matriculaStatusInicial: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "enviando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [matriculado, setMatriculado] = useState(Boolean(matriculaExistente));
  // Direto da prop, nunca em useState: router.refresh() troca o valor
  // que o servidor manda (matriculaStatusInicial) sem remontar este
  // componente, então um useState aqui ficaria preso no "null" de antes
  // de matricular — a mensagem de "liberado na hora" nunca apareceria
  // depois do clique, só reaparecendo certa se a página fosse recarregada
  // na mão.
  const liberadaNaHora = matriculaStatusInicial === "pago";

  async function handleClick() {
    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/entrar?depois=/cursos/${cursoId}`);
      return;
    }

    const { error } = await supabase.rpc("matricular_em_curso", { p_curso_id: cursoId });

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    setMatriculado(true);
    setStatus("idle");
    // Sem isso, a seção de material (carregada no servidor a partir de
    // matriculaExistente) só aparecia depois de recarregar a página na
    // mão — a matrícula "reservava" sem o aluno ver o material na hora.
    router.refresh();
  }

  if (matriculado) {
    if (liberadaNaHora) {
      return (
        <div className="card" style={{ background: "var(--primary-tint)", border: "none" }}>
          <span className="badge badge-primary">Matrícula confirmada</span>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 8, marginBottom: 0 }}>
            Acesso liberado na hora — aproveite o material abaixo.
          </p>
        </div>
      );
    }
    return (
      <div className="card" style={{ background: "var(--amber-tint)", border: "none" }}>
        <span className="badge badge-amber">Matrícula reservada</span>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 8, marginBottom: 0 }}>
          O pagamento via Mercado Pago ainda não está conectado nesta versão
          — sua vaga fica reservada e avisamos assim que o checkout estiver
          disponível.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleClick}
        disabled={status === "enviando"}
      >
        {status === "enviando" ? "Reservando…" : "Quero me matricular"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </>
  );
}
