"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hojeISO } from "@/lib/data";

type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  observacoes: string | null;
  status: string;
  valor_venda: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contatado: "Contatado",
  agendado: "Agendado",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STATUS_BADGE: Record<string, string> = {
  novo: "badge-outline",
  contatado: "badge-amber",
  agendado: "badge-primary",
  convertido: "badge-primary",
  perdido: "badge-coral",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function LeadCard({ lead, corretorId }: { lead: Lead; corretorId: string }) {
  const router = useRouter();
  const [agendando, setAgendando] = useState(false);
  const [convertendo, setConvertendo] = useState(false);
  const [valorVenda, setValorVenda] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // --- agendar visita a partir do lead ---
  const [data, setData] = useState(hojeISO());
  const [horario, setHorario] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [configurado, setConfigurado] = useState(true);
  const [buscandoHorarios, setBuscandoHorarios] = useState(false);

  useEffect(() => {
    if (!agendando) return;
    let cancelado = false;
    setBuscandoHorarios(true);
    fetch(`/api/visitas/horarios-disponiveis?corretor_id=${corretorId}&data=${data}`)
      .then((r) => r.json())
      .then((dados: { configurado: boolean; horarios: string[] }) => {
        if (cancelado) return;
        setConfigurado(dados.configurado);
        setHorarios(dados.configurado ? dados.horarios : []);
      })
      .catch(() => {
        if (!cancelado) setConfigurado(false);
      })
      .finally(() => {
        if (!cancelado) setBuscandoHorarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, [agendando, data, corretorId]);

  async function marcarContatado() {
    setSalvando(true);
    const supabase = createClient();
    await supabase.from("leads").update({ status: "contatado", updated_at: new Date().toISOString() }).eq("id", lead.id);
    setSalvando(false);
    router.refresh();
  }

  async function marcarPerdido() {
    setSalvando(true);
    const supabase = createClient();
    await supabase.from("leads").update({ status: "perdido", updated_at: new Date().toISOString() }).eq("id", lead.id);
    setSalvando(false);
    router.refresh();
  }

  async function confirmarConvertido(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(valorVenda.replace(",", "."));
    if (!valor || valor <= 0) {
      setErro("Informe o valor da venda.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: "convertido", valor_venda: valor, updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    setSalvando(false);
    if (error) {
      setErro("Não foi possível salvar.");
      return;
    }
    router.refresh();
  }

  async function confirmarAgendamento() {
    if (!horario) return;
    setSalvando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/visitas/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corretor_id: corretorId,
          data,
          horario,
          cliente_avulso: {
            nome: lead.nome,
            telefone: lead.telefone || undefined,
            email: lead.email || undefined,
          },
        }),
      });
      const dados = (await resposta.json()) as { erro?: string; visitaId?: string };

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível agendar.");
        setSalvando(false);
        return;
      }

      const supabase = createClient();
      await supabase
        .from("leads")
        .update({ status: "agendado", visita_id: dados.visitaId, updated_at: new Date().toISOString() })
        .eq("id", lead.id);

      setSalvando(false);
      setAgendando(false);
      router.refresh();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setSalvando(false);
    }
  }

  const podeAgir = lead.status !== "convertido" && lead.status !== "perdido";

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="flex between items-center" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{lead.nome}</div>
          <div className="hint" style={{ margin: 0 }}>
            {lead.telefone ?? "sem telefone"}
            {lead.email ? ` · ${lead.email}` : ""}
            {lead.origem ? ` · ${lead.origem}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${STATUS_BADGE[lead.status] ?? "badge-outline"}`}>
            {STATUS_LABEL[lead.status] ?? lead.status}
          </span>
          {lead.valor_venda != null && (
            <div className="hint" style={{ margin: "4px 0 0" }}>{formatoMoeda.format(lead.valor_venda)}</div>
          )}
        </div>
      </div>

      {podeAgir && !agendando && !convertendo && (
        <div className="flex gap-8 mt-16" style={{ flexWrap: "wrap" }}>
          {lead.status === "novo" && (
            <button type="button" className="btn btn-outline btn-sm" onClick={marcarContatado} disabled={salvando}>
              Marcar contatado
            </button>
          )}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setAgendando(true)}>
            📅 Agendar visita
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setConvertendo(true)}>
            ✓ Marcar convertido
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={marcarPerdido} disabled={salvando}>
            Marcar perdido
          </button>
        </div>
      )}

      {agendando && (
        <div className="mt-16" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <div className="field">
            <label htmlFor={`data-${lead.id}`}>Quando é a visita?</label>
            <input
              id={`data-${lead.id}`}
              type="date"
              value={data}
              min={hojeISO()}
              onChange={(e) => {
                setData(e.target.value);
                setHorario(null);
              }}
            />
          </div>
          {!configurado ? (
            <p className="hint">
              Configure sua <a href="/painel-negocios/disponibilidade">disponibilidade semanal</a> antes de agendar.
            </p>
          ) : buscandoHorarios ? (
            <p className="hint">Buscando horários livres…</p>
          ) : horarios.length > 0 ? (
            <div className="field">
              <label>Horários livres nesse dia</label>
              <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                {horarios.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={horario === h ? "badge badge-primary" : "badge badge-outline"}
                    style={{ cursor: "pointer", border: "none" }}
                    onClick={() => setHorario(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="hint">Nenhum horário livre nesse dia — tente outra data.</p>
          )}
          {erro && <p className="hint" style={{ color: "var(--coral)" }}>{erro}</p>}
          <div className="flex gap-8 mt-8">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={confirmarAgendamento}
              disabled={!horario || salvando}
            >
              {salvando ? "Agendando…" : "Confirmar agendamento"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAgendando(false)} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {convertendo && (
        <form
          onSubmit={confirmarConvertido}
          className="mt-16"
          style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}
        >
          <div className="field">
            <label htmlFor={`valor-${lead.id}`}>Valor da venda (R$)</label>
            <input
              id={`valor-${lead.id}`}
              type="text"
              inputMode="decimal"
              value={valorVenda}
              onChange={(e) => setValorVenda(e.target.value)}
              placeholder="Ex.: 350000"
            />
          </div>
          {erro && <p className="hint" style={{ color: "var(--coral)" }}>{erro}</p>}
          <div className="flex gap-8">
            <button type="submit" className="btn btn-primary btn-sm" disabled={salvando}>
              {salvando ? "Salvando…" : "Confirmar venda"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConvertendo(false)} disabled={salvando}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
