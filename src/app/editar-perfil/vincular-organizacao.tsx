"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Organizacao = {
  id: string;
  nome: string;
  tipo: "imobiliaria" | "construtora";
  cidade: { nome: string; uf: string } | null;
};

type SolicitacaoPendente = {
  id: string;
  organizacao_catalogo_id: string;
};

const LABEL_TIPO: Record<Organizacao["tipo"], string> = {
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
};

// Vínculo do corretor a uma imobiliária/construtora do catálogo
// (cadastrado pelo admin do sistema, migração 0053). Desde a migração
// 0089 isso virou uma SOLICITAÇÃO: o corretor escolhe, mas só passa a
// valer (e só aparece no painel do gestor) depois que um gestor da
// própria organização aprova — sem isso, qualquer corretor podia se
// declarar vinculado a qualquer organização sem ninguém checar nada.
// Desvincular continua imediato, sem aprovação (reduzir acesso nunca
// precisa de ok de ninguém).
export function VincularOrganizacao({
  organizacaoAtualId,
}: {
  organizacaoAtualId: string | null;
}) {
  const [organizacoes, setOrganizacoes] = useState<Organizacao[] | null>(null);
  const [organizacaoId, setOrganizacaoId] = useState(organizacaoAtualId);
  const [solicitacaoCorretor, setSolicitacaoCorretor] = useState<SolicitacaoPendente | null>(null);
  const [solicitacaoGestor, setSolicitacaoGestor] = useState<SolicitacaoPendente | null>(null);
  const [ehGestor, setEhGestor] = useState(false);
  const [selecionada, setSelecionada] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregarEstado = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [perfilRes, solicitacoesRes, gestorRes] = await Promise.all([
      supabase.from("corretor_perfis").select("organizacao_catalogo_id").eq("profile_id", user.id).single(),
      supabase
        .from("solicitacoes_vinculo")
        .select("id, organizacao_catalogo_id, tipo")
        .eq("solicitante_id", user.id)
        .eq("status", "pendente"),
      supabase.from("gestor_perfis").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    ]);

    setOrganizacaoId(perfilRes.data?.organizacao_catalogo_id ?? null);
    const pendentes = solicitacoesRes.data ?? [];
    setSolicitacaoCorretor(pendentes.find((s) => s.tipo === "corretor") ?? null);
    setSolicitacaoGestor(pendentes.find((s) => s.tipo === "gestor") ?? null);
    setEhGestor(Boolean(gestorRes.data));
    setCarregando(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("organizacoes_catalogo")
      .select("id, nome, tipo, cidade:cidade_id(nome, uf)")
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        setOrganizacoes((data ?? []) as unknown as Organizacao[]);
      });
    carregarEstado();
  }, [carregarEstado]);

  function nomeDaOrganizacao(id: string | null) {
    if (!id || !organizacoes) return "—";
    return organizacoes.find((o) => o.id === id)?.nome ?? "—";
  }

  async function solicitarVinculo(novoId: string) {
    if (!novoId) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    // Via API, não direto no Supabase — a rota também avisa os
    // gestores da organização por WhatsApp (telefone deles e o token
    // da Meta nunca podem ir pro navegador).
    const resposta = await fetch("/api/solicitacoes-vinculo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizacao_catalogo_id: novoId, tipo: "corretor" }),
    });
    const corpo = await resposta.json().catch(() => ({}));

    setSalvando(false);
    setSelecionada("");

    if (!resposta.ok) {
      setErro(corpo.erro ?? "Não foi possível enviar a solicitação. Tente de novo.");
      return;
    }

    setMensagem("Solicitação enviada — aguarde a aprovação do gestor da organização.");
    carregarEstado();
  }

  async function cancelarSolicitacao(id: string) {
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("cancelar_solicitacao_vinculo", { p_solicitacao_id: id });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível cancelar a solicitação.");
      return;
    }

    setMensagem("Solicitação cancelada.");
    carregarEstado();
  }

  async function desvincular() {
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("desvincular_organizacao_corretor");

    setSalvando(false);

    if (error) {
      setErro("Não foi possível desvincular. Tente de novo.");
      return;
    }

    setMensagem("Vínculo removido — você segue como autônomo.");
    carregarEstado();
  }

  async function pedirParaVirarGestor() {
    if (!organizacaoId) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    const resposta = await fetch("/api/solicitacoes-vinculo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizacao_catalogo_id: organizacaoId, tipo: "gestor" }),
    });
    const corpo = await resposta.json().catch(() => ({}));

    setSalvando(false);

    if (!resposta.ok) {
      setErro(corpo.erro ?? "Não foi possível enviar o pedido. Tente de novo.");
      return;
    }

    setMensagem("Pedido para virar gestor enviado — aguarde a aprovação.");
    carregarEstado();
  }

  return (
    <div className="card mt-24" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Imobiliária ou construtora</h2>

      {carregando || organizacoes === null ? (
        <p className="hint">Carregando…</p>
      ) : organizacaoId ? (
        <>
          <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
            Vinculado a <strong>{nomeDaOrganizacao(organizacaoId)}</strong>.
          </p>
          <button type="button" className="btn btn-outline btn-sm" disabled={salvando} onClick={desvincular}>
            Desvincular
          </button>

          <div className="mt-16" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            {ehGestor ? (
              <p className="hint" style={{ margin: 0 }}>
                Você também é gestor desta organização.{" "}
                <Link href="/painel-gestor">Ir para o painel do gestor →</Link>
              </p>
            ) : solicitacaoGestor ? (
              <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 8 }}>
                <p className="hint" style={{ margin: 0 }}>
                  Pedido para virar gestor enviado — aguardando aprovação.
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={salvando}
                  onClick={() => cancelarSolicitacao(solicitacaoGestor.id)}
                >
                  Cancelar pedido
                </button>
              </div>
            ) : (
              <div>
                <p className="hint" style={{ marginTop: 0, marginBottom: 8 }}>
                  Também quer acompanhar os leads e agendamentos de toda a equipe desta
                  organização?
                </p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={salvando}
                  onClick={pedirParaVirarGestor}
                >
                  Pedir para virar gestor desta organização
                </button>
              </div>
            )}
          </div>
        </>
      ) : solicitacaoCorretor ? (
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 8 }}>
          <p className="hint" style={{ margin: 0 }}>
            Solicitação enviada a <strong>{nomeDaOrganizacao(solicitacaoCorretor.organizacao_catalogo_id)}</strong> —
            aguardando aprovação do gestor.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={salvando}
            onClick={() => cancelarSolicitacao(solicitacaoCorretor.id)}
          >
            Cancelar solicitação
          </button>
        </div>
      ) : organizacoes.length === 0 ? (
        <p className="hint">Nenhuma imobiliária/construtora cadastrada ainda na sua região.</p>
      ) : (
        <div className="field">
          <label htmlFor="organizacao-select">Pedir vínculo com</label>
          <p className="hint" style={{ marginTop: 0 }}>
            O vínculo só passa a valer depois que um gestor da organização aprovar seu
            pedido.
          </p>
          <select
            id="organizacao-select"
            value={selecionada}
            disabled={salvando}
            onChange={(e) => {
              setSelecionada(e.target.value);
              solicitarVinculo(e.target.value);
            }}
          >
            <option value="">Selecione…</option>
            {organizacoes.map((org) => (
              <option key={org.id} value={org.id}>
                {org.nome} ({LABEL_TIPO[org.tipo]}
                {org.cidade ? ` · ${org.cidade.nome}/${org.cidade.uf}` : ""})
              </option>
            ))}
          </select>
        </div>
      )}

      {mensagem && <p className="hint">{mensagem}</p>}
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
