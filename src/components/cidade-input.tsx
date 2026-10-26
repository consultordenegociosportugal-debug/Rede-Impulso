"use client";

import { useState } from "react";

type Municipio = { nome: string; uf: string };

// Lista de municípios do IBGE (pública, sem chave) — carregada uma vez só
// por sessão de navegação e reaproveitada por todo campo de cidade da
// página, pra sugerir conforme digita em vez de depender do usuário
// acertar grafia/acentuação sozinho.
let cacheMunicipios: Municipio[] | null = null;
let cachePromise: Promise<Municipio[]> | null = null;

type MunicipioIBGE = {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
  "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } };
};

async function carregarMunicipios(): Promise<Municipio[]> {
  if (cacheMunicipios) return cacheMunicipios;
  if (!cachePromise) {
    cachePromise = fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome",
    )
      .then((r) => r.json())
      .then((dados: MunicipioIBGE[]) =>
        dados.map((m) => ({
          nome: m.nome,
          uf:
            m.microrregiao?.mesorregiao?.UF?.sigla ??
            m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla ??
            "",
        })),
      )
      .catch(() => []);
  }
  cacheMunicipios = await cachePromise;
  return cacheMunicipios;
}

export function CidadeInput({
  id,
  value,
  onChange,
  placeholder = "São Luís",
}: {
  id: string;
  value: string;
  onChange: (cidade: string) => void;
  placeholder?: string;
}) {
  const [sugestoes, setSugestoes] = useState<Municipio[]>([]);
  const [aberto, setAberto] = useState(false);

  async function buscar(texto: string) {
    if (texto.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const todas = await carregarMunicipios();
    const termo = texto.trim().toLowerCase();
    setSugestoes(todas.filter((m) => m.nome.toLowerCase().startsWith(termo)).slice(0, 8));
  }

  return (
    <div className="tags-input" style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          buscar(e.target.value);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => {
          window.setTimeout(() => setAberto(false), 150);
        }}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="tags-suggestions">
          {sugestoes.map((m) => (
            <button
              type="button"
              key={`${m.nome}-${m.uf}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m.uf ? `${m.nome}/${m.uf}` : m.nome);
                setSugestoes([]);
                setAberto(false);
              }}
            >
              {m.nome}
              {m.uf ? `/${m.uf}` : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
