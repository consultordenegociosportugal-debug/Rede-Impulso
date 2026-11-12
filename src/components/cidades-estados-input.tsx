"use client";

import { useEffect, useRef, useState } from "react";

// Campo de cidades/estados de atuação em "tags" — igual o BairrosInput,
// mas pra corretor que atua em mais de uma cidade ou até em um estado
// inteiro (comum pra quem tem CRECI em mais de um estado). Sugere
// município (via IBGE, formato "Cidade/UF") e também o estado inteiro
// (formato "Estado (estado todo)") conforme digita.
type Municipio = { nome: string; uf: string };
type Estado = { nome: string; sigla: string };

let cacheMunicipios: Municipio[] | null = null;
let cacheEstados: Estado[] | null = null;
let cachePromise: Promise<{ municipios: Municipio[]; estados: Estado[] }> | null = null;

type MunicipioIBGE = {
  nome: string;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
  "regiao-imediata"?: { "regiao-intermediaria"?: { UF?: { sigla?: string } } };
};
type EstadoIBGE = { nome: string; sigla: string };

async function carregarListas(): Promise<{ municipios: Municipio[]; estados: Estado[] }> {
  if (cacheMunicipios && cacheEstados) {
    return { municipios: cacheMunicipios, estados: cacheEstados };
  }
  if (!cachePromise) {
    cachePromise = Promise.all([
      fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome")
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
        .catch(() => [] as Municipio[]),
      fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
        .then((r) => r.json())
        .then((dados: EstadoIBGE[]) => dados.map((e) => ({ nome: e.nome, sigla: e.sigla })))
        .catch(() => [] as Estado[]),
    ]).then(([municipios, estados]) => ({ municipios, estados }));
  }
  const resultado = await cachePromise;
  cacheMunicipios = resultado.municipios;
  cacheEstados = resultado.estados;
  return resultado;
}

function formatarEstado(estado: Estado): string {
  return `${estado.nome} (estado todo)`;
}

export function CidadesEstadosInput({
  id,
  value,
  onChange,
  placeholder = "São Luís, Maranhão…",
}: {
  id: string;
  value: string[];
  onChange: (cidades: string[]) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [sugestoesMunicipio, setSugestoesMunicipio] = useState<Municipio[]>([]);
  const [sugestoesEstado, setSugestoesEstado] = useState<Estado[]>([]);
  const [aberto, setAberto] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (texto.trim().length < 2) {
      setSugestoesMunicipio([]);
      setSugestoesEstado([]);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      const { municipios, estados } = await carregarListas();
      const termo = texto.trim().toLowerCase();
      setSugestoesMunicipio(
        municipios.filter((m) => m.nome.toLowerCase().startsWith(termo)).slice(0, 6),
      );
      setSugestoesEstado(
        estados
          .filter(
            (e) => e.nome.toLowerCase().startsWith(termo) || e.sigla.toLowerCase() === termo,
          )
          .filter((e) => !value.includes(formatarEstado(e)))
          .slice(0, 3),
      );
    }, 200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [texto, value]);

  function adicionar(item: string) {
    const limpo = item.trim();
    const jaExiste = value.some((v) => v.toLowerCase() === limpo.toLowerCase());
    if (!limpo || jaExiste) {
      setTexto("");
      return;
    }
    onChange([...value, limpo]);
    setTexto("");
    setSugestoesMunicipio([]);
    setSugestoesEstado([]);
  }

  function remover(item: string) {
    onChange(value.filter((v) => v !== item));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Sem o stopPropagation, o Enter também aciona o avançar de passo
      // do formulário — mesmo motivo do BairrosInput. Diferente de
      // bairro, cidade/estado tem fonte oficial (IBGE) — só aceita o
      // valor se ele vier de uma sugestão real, nunca texto livre, pra
      // não deixar lixo no perfil público nem furar a busca.
      e.preventDefault();
      e.stopPropagation();
      const primeiraSugestao =
        sugestoesMunicipio[0] != null
          ? sugestoesMunicipio[0].uf
            ? `${sugestoesMunicipio[0].nome}/${sugestoesMunicipio[0].uf}`
            : sugestoesMunicipio[0].nome
          : sugestoesEstado[0] != null
            ? formatarEstado(sugestoesEstado[0])
            : null;
      if (primeiraSugestao) adicionar(primeiraSugestao);
    } else if (e.key === "Backspace" && !texto && value.length > 0) {
      remover(value[value.length - 1]);
    }
  }

  const temSugestoes = sugestoesMunicipio.length > 0 || sugestoesEstado.length > 0;

  return (
    <div className="tags-input" style={{ position: "relative" }}>
      <div className="tags-input-chips">
        {value.map((item) => (
          <span key={item} className="tag-chip">
            {item}
            <button type="button" onClick={() => remover(item)} aria-label={`Remover ${item}`}>
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setAberto(true)}
          onBlur={() => {
            window.setTimeout(() => setAberto(false), 150);
          }}
          placeholder={value.length === 0 ? placeholder : "Adicionar outra…"}
        />
      </div>
      {aberto && temSugestoes && (
        <div className="tags-suggestions">
          {sugestoesMunicipio.map((m) => (
            <button
              type="button"
              key={`${m.nome}-${m.uf}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => adicionar(m.uf ? `${m.nome}/${m.uf}` : m.nome)}
            >
              {m.nome}
              {m.uf ? `/${m.uf}` : ""}
            </button>
          ))}
          {sugestoesEstado.map((e) => (
            <button
              type="button"
              key={e.sigla}
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => adicionar(formatarEstado(e))}
            >
              📍 {formatarEstado(e)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
