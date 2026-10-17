"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Organizacao = {
  id: string;
  nome: string;
  tipo: "imobiliaria" | "construtora";
  cidade: { nome: string; uf: string } | null;
};

const LABEL_TIPO: Record<Organizacao["tipo"], string> = {
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
};

// Vínculo do corretor a uma imobiliária/construtora do catálogo
// (cadastrado pelo admin do sistema, migração 0053) — é só uma
// etiqueta, sem conta de login do outro lado, então o corretor escolhe
// e grava direto, sem pedir aprovação de ninguém.
export function VincularOrganizacao({
  organizacaoAtualId,
}: {
  organizacaoAtualId: string | null;
}) {
  const [organizacoes, setOrganizacoes] = useState<Organizacao[] | null>(null);
  const [selecionada, setSelecionada] = useState(organizacaoAtualId ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("organizacoes_catalogo")
      .select("id, nome, tipo, cidade:cidade_id(nome, uf)")
      .order("nome", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setErro("Não foi possível carregar o catálogo de imobiliárias/construtoras.");
          return;
        }
        setOrganizacoes((data ?? []) as unknown as Organizacao[]);
      });
  }, []);

  async function salvar(novoId: string) {
    setSalvando(true);
    setErro(null);
    setMensagem(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErro("Sua sessão expirou — recarregue a página.");
      setSalvando(false);
      return;
    }

    const { error } = await supabase
      .from("corretor_perfis")
      .update({ organizacao_catalogo_id: novoId || null })
      .eq("profile_id", user.id);

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar o vínculo. Tente de novo.");
      return;
    }

    setSelecionada(novoId);
    setMensagem(novoId ? "Vínculo atualizado." : "Vínculo removido — você segue como autônomo.");
  }

  return (
    <div className="card mt-24" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Imobiliária ou construtora</h2>
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Se você trabalha vinculado a uma imobiliária ou construtora cadastrada na Rede
        Impulso, selecione aqui — não precisa de aprovação de ninguém.
      </p>

      {organizacoes === null ? (
        <p className="hint">Carregando catálogo…</p>
      ) : organizacoes.length === 0 ? (
        <p className="hint">Nenhuma imobiliária/construtora cadastrada ainda na sua região.</p>
      ) : (
        <div className="field">
          <label htmlFor="organizacao-select">Vinculado a</label>
          <select
            id="organizacao-select"
            value={selecionada}
            disabled={salvando}
            onChange={(e) => salvar(e.target.value)}
          >
            <option value="">Nenhuma — trabalho de forma autônoma</option>
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
