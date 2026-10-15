"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type JanelaExistente = { dia_semana: number; hora_inicio: string; hora_fim: string };

const DIAS = [
  { valor: 0, label: "Domingo" },
  { valor: 1, label: "Segunda" },
  { valor: 2, label: "Terça" },
  { valor: 3, label: "Quarta" },
  { valor: 4, label: "Quinta" },
  { valor: 5, label: "Sexta" },
  { valor: 6, label: "Sábado" },
];

type LinhaDia = { ativo: boolean; inicio: string; fim: string };

function estadoInicial(janelas: JanelaExistente[]): Record<number, LinhaDia> {
  const porDia: Record<number, LinhaDia> = {};
  for (const dia of DIAS) {
    const existente = janelas.find((j) => j.dia_semana === dia.valor);
    porDia[dia.valor] = existente
      ? { ativo: true, inicio: existente.hora_inicio.slice(0, 5), fim: existente.hora_fim.slice(0, 5) }
      : { ativo: false, inicio: "09:00", fim: "18:00" };
  }
  return porDia;
}

export function DisponibilidadeForm({ janelasExistentes }: { janelasExistentes: JanelaExistente[] }) {
  const [dias, setDias] = useState<Record<number, LinhaDia>>(() => estadoInicial(janelasExistentes));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function atualizar(dia: number, mudanca: Partial<LinhaDia>) {
    setDias((atuais) => ({ ...atuais, [dia]: { ...atuais[dia], ...mudanca } }));
    setSucesso(false);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(false);

    const ativos = DIAS.filter((d) => dias[d.valor].ativo);
    for (const dia of ativos) {
      if (dias[dia.valor].fim <= dias[dia.valor].inicio) {
        setErro(`Em ${dia.label}, o horário final precisa ser depois do inicial.`);
        setSalvando(false);
        return;
      }
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sua sessão expirou. Entre de novo.");
      setSalvando(false);
      return;
    }

    // Substitui tudo: mais simples e seguro que tentar casar upsert com
    // remoção seletiva de dias desmarcados.
    const { error: erroDelete } = await supabase
      .from("disponibilidade_semanal")
      .delete()
      .eq("profile_id", user.id);

    if (erroDelete) {
      setErro(erroDelete.message);
      setSalvando(false);
      return;
    }

    if (ativos.length > 0) {
      const { error: erroInsert } = await supabase.from("disponibilidade_semanal").insert(
        ativos.map((dia) => ({
          profile_id: user.id,
          dia_semana: dia.valor,
          hora_inicio: dias[dia.valor].inicio,
          hora_fim: dias[dia.valor].fim,
        })),
      );

      if (erroInsert) {
        setErro(erroInsert.message);
        setSalvando(false);
        return;
      }
    }

    setSalvando(false);
    setSucesso(true);
  }

  return (
    <div className="card">
      {DIAS.map((dia) => {
        const linha = dias[dia.valor];
        return (
          <div
            key={dia.valor}
            className="list-row"
            style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}
          >
            <label className="flex items-center gap-8" style={{ minWidth: 140, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={linha.ativo}
                onChange={(e) => atualizar(dia.valor, { ativo: e.target.checked })}
              />
              {dia.label}
            </label>
            <input
              type="time"
              value={linha.inicio}
              disabled={!linha.ativo}
              onChange={(e) => atualizar(dia.valor, { inicio: e.target.value })}
              style={{ width: "auto" }}
            />
            <span className="muted">até</span>
            <input
              type="time"
              value={linha.fim}
              disabled={!linha.ativo}
              onChange={(e) => atualizar(dia.valor, { fim: e.target.value })}
              style={{ width: "auto" }}
            />
          </div>
        );
      })}

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 12 }}>
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="hint" style={{ color: "var(--primary)", marginTop: 12 }}>
          Disponibilidade salva.
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary mt-16"
        onClick={salvar}
        disabled={salvando}
      >
        {salvando ? "Salvando…" : "Salvar disponibilidade"}
      </button>
    </div>
  );
}
