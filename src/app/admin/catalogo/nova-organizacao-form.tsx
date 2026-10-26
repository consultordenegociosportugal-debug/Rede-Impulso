"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarCnpj } from "@/lib/mascaras";
import { cnpjValido } from "@/lib/validacoes";

type Cidade = { id: string; nome: string; uf: string };

type DadosCnpj = {
  razao_social?: string;
  nome_fantasia?: string;
  municipio?: string;
  uf?: string;
};

export function NovaOrganizacaoForm({ cidades }: { cidades: Cidade[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"imobiliaria" | "construtora">("imobiliaria");
  const [cidadeId, setCidadeId] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [emailGestor, setEmailGestor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [avisoCnpj, setAvisoCnpj] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Com os 14 dígitos completos, busca a empresa na base pública da Receita
  // (via BrasilAPI, sem chave) e preenche nome e cidade sozinho — só
  // confirma CNPJ, não precisa redigitar razão social.
  useEffect(() => {
    const digitos = cnpj.replace(/\D/g, "");
    if (digitos.length !== 14) {
      setAvisoCnpj(null);
      return;
    }

    if (!cnpjValido(digitos)) {
      setAvisoCnpj("Esse CNPJ não é válido — confira os números digitados.");
      return;
    }

    let cancelado = false;
    setBuscandoCnpj(true);
    setAvisoCnpj(null);

    fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((dados: DadosCnpj) => {
        if (cancelado) return;

        const nomeEmpresa = dados.nome_fantasia?.trim() || dados.razao_social?.trim();
        if (nomeEmpresa) setNome(nomeEmpresa);

        if (dados.municipio && dados.uf) {
          const encontrada = cidades.find(
            (c) =>
              c.nome.toLowerCase() === dados.municipio!.toLowerCase() &&
              c.uf.toUpperCase() === dados.uf!.toUpperCase(),
          );
          if (encontrada) {
            setCidadeId(encontrada.id);
          } else {
            setAvisoCnpj(
              `Empresa é de ${dados.municipio}/${dados.uf} — cadastre essa cidade ao lado se quiser vincular.`,
            );
          }
        }
      })
      .catch(() => {
        if (!cancelado) setAvisoCnpj("Não encontramos esse CNPJ — confira o número ou preencha manualmente.");
      })
      .finally(() => {
        if (!cancelado) setBuscandoCnpj(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cnpj]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome.");
      return;
    }
    if (cnpj.trim() && !cnpjValido(cnpj)) {
      setErro("O CNPJ informado não é válido.");
      return;
    }

    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.from("organizacoes_catalogo").insert({
      nome: nome.trim(),
      tipo,
      cidade_id: cidadeId || null,
      cnpj: cnpj.trim() || null,
      email_gestor: emailGestor.trim() || null,
    });

    setEnviando(false);

    if (error) {
      setErro("Não foi possível cadastrar.");
      return;
    }

    setNome("");
    setCnpj("");
    setEmailGestor("");
    setAvisoCnpj(null);
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="card" style={{ padding: 16 }}>
      <div className="grid grid-2" style={{ gap: 8 }}>
        <input
          type="text"
          value={cnpj}
          onChange={(e) => setCnpj(formatarCnpj(e.target.value))}
          placeholder={buscandoCnpj ? "Buscando CNPJ…" : "CNPJ (opcional)"}
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
          <option value="imobiliaria">Imobiliária</option>
          <option value="construtora">Construtora</option>
        </select>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da empresa"
        />
        <select value={cidadeId} onChange={(e) => setCidadeId(e.target.value)}>
          <option value="">Sem cidade</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}/{c.uf}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={emailGestor}
          onChange={(e) => setEmailGestor(e.target.value)}
          placeholder="E-mail do gestor de vendas (opcional)"
        />
      </div>
      {avisoCnpj && (
        <p className="hint" style={{ color: "var(--amber)" }}>
          {avisoCnpj}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-sm mt-12" disabled={enviando}>
        {enviando ? "Salvando…" : "+ Cadastrar"}
      </button>
      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}
    </form>
  );
}
