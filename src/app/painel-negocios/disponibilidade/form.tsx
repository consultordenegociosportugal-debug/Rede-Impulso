"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DURACAO_SLOT_MINUTOS } from "@/lib/disponibilidade";

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

type Intervalo = { inicio: string; fim: string };
type LinhaDia = { ativo: boolean; intervalos: Intervalo[] };

function paraMinutos(horaHHmm: string) {
  const [h, m] = horaHHmm.split(":").map(Number);
  return h * 60 + m;
}

function estadoInicial(janelas: JanelaExistente[]): Record<number, LinhaDia> {
  const porDia: Record<number, LinhaDia> = {};
  for (const dia of DIAS) {
    const existentes = janelas.filter((j) => j.dia_semana === dia.valor);
    porDia[dia.valor] =
      existentes.length > 0
        ? {
            ativo: true,
            intervalos: existentes.map((j) => ({
              inicio: j.hora_inicio.slice(0, 5),
              fim: j.hora_fim.slice(0, 5),
            })),
          }
        : { ativo: false, intervalos: [{ inicio: "09:00", fim: "18:00" }] };
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

  function atualizarIntervalo(dia: number, indice: number, mudanca: Partial<Intervalo>) {
    setDias((atuais) => {
      const intervalos = atuais[dia].intervalos.map((intervalo, i) =>
        i === indice ? { ...intervalo, ...mudanca } : intervalo,
      );
      return { ...atuais, [dia]: { ...atuais[dia], intervalos } };
    });
    setSucesso(false);
  }

  function adicionarIntervalo(dia: number) {
    setDias((atuais) => ({
      ...atuais,
      [dia]: { ...atuais[dia], intervalos: [...atuais[dia].intervalos, { inicio: "14:00", fim: "18:00" }] },
    }));
    setSucesso(false);
  }

  function removerIntervalo(dia: number, indice: number) {
    setDias((atuais) => ({
      ...atuais,
      [dia]: { ...atuais[dia], intervalos: atuais[dia].intervalos.filter((_, i) => i !== indice) },
    }));
    setSucesso(false);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(false);

    const ativos = DIAS.filter((d) => dias[d.valor].ativo);
    const janelasParaSalvar: { dia_semana: number; hora_inicio: string; hora_fim: string }[] = [];

    for (const dia of ativos) {
      const intervalos = [...dias[dia.valor].intervalos].sort(
        (a, b) => paraMinutos(a.inicio) - paraMinutos(b.inicio),
      );
      for (let i = 0; i < intervalos.length; i++) {
        const { inicio, fim } = intervalos[i];
        if (fim <= inicio) {
          setErro(`Em ${dia.label}, o horário final precisa ser depois do inicial.`);
          setSalvando(false);
          return;
        }
        // Sem isto, dava pra salvar uma janela menor que a duração de uma
        // visita e achar que configurou disponibilidade — nenhum horário
        // apareceria pra quem fosse agendar, sem nenhum aviso do motivo.
        if (paraMinutos(fim) - paraMinutos(inicio) < DURACAO_SLOT_MINUTOS) {
          setErro(
            `Em ${dia.label}, cada intervalo precisa ter pelo menos ${DURACAO_SLOT_MINUTOS} minutos — é a duração de uma visita, senão nenhum horário aparece pra quem for agendar.`,
          );
          setSalvando(false);
          return;
        }
        // Dois intervalos do mesmo dia se sobrepondo geraria o mesmo
        // horário duas vezes na lista de quem for agendar.
        const proximo = intervalos[i + 1];
        if (proximo && paraMinutos(fim) > paraMinutos(proximo.inicio)) {
          setErro(`Em ${dia.label}, os intervalos não podem se sobrepor.`);
          setSalvando(false);
          return;
        }
      }
      for (const intervalo of intervalos) {
        janelasParaSalvar.push({ dia_semana: dia.valor, hora_inicio: intervalo.inicio, hora_fim: intervalo.fim });
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

    // Substitui tudo numa chamada só (function salvar_disponibilidade_semanal,
    // migração 0067) — apagar e inserir como duas chamadas separadas deixava
    // a disponibilidade inteira zerada se a segunda falhasse depois da
    // primeira já ter ido (sessão expirada, internet caindo no meio).
    const { error: erroSalvar } = await supabase.rpc("salvar_disponibilidade_semanal", {
      p_janelas: janelasParaSalvar,
    });

    if (erroSalvar) {
      setErro(erroSalvar.message);
      setSalvando(false);
      return;
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
            style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}
          >
            <label className="flex items-center gap-8" style={{ minWidth: 140, cursor: "pointer", paddingTop: 9 }}>
              <input
                type="checkbox"
                checked={linha.ativo}
                onChange={(e) => atualizar(dia.valor, { ativo: e.target.checked })}
              />
              {dia.label}
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {linha.intervalos.map((intervalo, indice) => (
                <div key={indice} className="flex items-end gap-8" style={{ flexWrap: "nowrap" }}>
                  <label style={{ margin: 0 }}>
                    <span className="hint" style={{ display: "block", marginBottom: 4 }}>
                      Hora de início
                    </span>
                    <input
                      type="time"
                      value={intervalo.inicio}
                      disabled={!linha.ativo}
                      onChange={(e) => atualizarIntervalo(dia.valor, indice, { inicio: e.target.value })}
                      style={{ width: "auto" }}
                    />
                  </label>
                  <span className="muted" style={{ paddingBottom: 9 }}>
                    até
                  </span>
                  <label style={{ margin: 0 }}>
                    <span className="hint" style={{ display: "block", marginBottom: 4 }}>
                      Hora de término
                    </span>
                    <input
                      type="time"
                      value={intervalo.fim}
                      disabled={!linha.ativo}
                      onChange={(e) => atualizarIntervalo(dia.valor, indice, { fim: e.target.value })}
                      style={{ width: "auto" }}
                    />
                  </label>
                  {linha.intervalos.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={!linha.ativo}
                      onClick={() => removerIntervalo(dia.valor, indice)}
                      aria-label={`Remover intervalo de ${dia.label}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!linha.ativo}
                onClick={() => adicionarIntervalo(dia.valor)}
                style={{ alignSelf: "flex-start" }}
              >
                + Adicionar intervalo (ex.: almoço)
              </button>
            </div>
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
