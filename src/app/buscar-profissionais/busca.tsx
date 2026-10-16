"use client";

import Link from "next/link";
import { useState } from "react";

type Papel = "corretor" | "imobiliaria" | "construtora";
type Modo = "nome" | "cidade" | "proximas";

type Resultado = {
  id: string;
  nome: string;
  papel: Papel;
  cidade: string | null;
  detalhe: string | null;
};

const ICONE_PAPEL: Record<Papel, string> = {
  corretor: "🧑‍💼",
  imobiliaria: "🏢",
  construtora: "🏗️",
};

const LABEL_PAPEL: Record<Papel, string> = {
  corretor: "Corretor autônomo",
  imobiliaria: "Imobiliária",
  construtora: "Construtora/incorporadora",
};

async function buscar(modo: "nome" | "cidade", valor: string): Promise<Resultado[]> {
  const resp = await fetch(
    `/api/buscar-profissionais?modo=${modo}&q=${encodeURIComponent(valor)}`,
  );
  if (!resp.ok) throw new Error("falha na busca");
  const dados = await resp.json();
  return dados.resultados ?? [];
}

export function BuscaProfissionais() {
  const [modo, setModo] = useState<Modo>("nome");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [status, setStatus] = useState<"idle" | "buscando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [cidadeDetectada, setCidadeDetectada] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termo.trim() || modo === "proximas") return;
    setStatus("buscando");
    setErro(null);
    try {
      setResultados(await buscar(modo, termo));
      setStatus("idle");
    } catch {
      setErro("Não foi possível buscar agora. Tente de novo.");
      setStatus("erro");
    }
  }

  function handleModo(novoModo: Modo) {
    setModo(novoModo);
    setTermo("");
    setResultados(null);
    setErro(null);
    setCidadeDetectada(null);
    if (novoModo === "proximas") handleProximas();
  }

  function handleProximas() {
    if (!navigator.geolocation) {
      setErro("Seu navegador não permite detectar sua localização.");
      setStatus("erro");
      return;
    }
    setStatus("buscando");
    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        try {
          const { latitude, longitude } = posicao.coords;
          const chave = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          const resp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${chave}&language=pt-BR`,
          );
          const dados = await resp.json();
          type Componente = { types: string[]; long_name: string };
          const componentes: Componente[] = dados.results?.[0]?.address_components ?? [];
          const cidade =
            componentes.find((c) => c.types.includes("administrative_area_level_2"))
              ?.long_name ??
            componentes.find((c) => c.types.includes("locality"))?.long_name;

          if (!cidade) {
            setErro("Não conseguimos identificar sua cidade. Tente buscar pelo nome.");
            setStatus("erro");
            return;
          }
          setCidadeDetectada(cidade);
          setResultados(await buscar("cidade", cidade));
          setStatus("idle");
        } catch {
          setErro("Não foi possível identificar profissionais perto de você agora.");
          setStatus("erro");
        }
      },
      () => {
        setErro("Permita o acesso à localização pra ver profissionais perto de você.");
        setStatus("erro");
      },
    );
  }

  return (
    <div className="mt-24">
      <div className="segmented">
        <button type="button" className={modo === "nome" ? "active" : undefined} onClick={() => handleModo("nome")}>
          Nome
        </button>
        <button type="button" className={modo === "cidade" ? "active" : undefined} onClick={() => handleModo("cidade")}>
          Cidade
        </button>
        <button type="button" className={modo === "proximas" ? "active" : undefined} onClick={() => handleModo("proximas")}>
          Próximas
        </button>
      </div>

      {modo !== "proximas" ? (
        <form onSubmit={handleSubmit} className="flex gap-8 mt-16" style={{ maxWidth: 480 }}>
          <input
            type="text"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder={modo === "nome" ? "Nome do corretor ou da empresa" : "Nome da cidade"}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={status === "buscando"}>
            {status === "buscando" ? "Buscando…" : "Buscar"}
          </button>
        </form>
      ) : (
        <p className="hint mt-16">
          {cidadeDetectada
            ? `Mostrando profissionais em ${cidadeDetectada} — comparamos pela cidade detectada, não pela distância exata.`
            : status === "buscando"
              ? "Detectando sua localização…"
              : "Usamos a localização do seu navegador para identificar sua cidade (não a distância exata)."}
        </p>
      )}

      {erro && (
        <p className="hint mt-16" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      {resultados && (
        <div className="grid grid-2 mt-24">
          {resultados.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "32px 20px", gridColumn: "1 / -1" }}>
              <p className="muted" style={{ margin: 0 }}>Nenhum profissional encontrado.</p>
            </div>
          ) : (
            resultados.map((r) => (
              <Link key={`${r.papel}-${r.id}`} href={`/perfil-corretor?id=${r.id}`} className="card">
                <div className="flex items-center gap-8">
                  <span style={{ fontSize: 20 }} aria-hidden="true">{ICONE_PAPEL[r.papel]}</span>
                  <strong style={{ fontSize: 15 }}>{r.nome}</strong>
                </div>
                <p className="hint" style={{ marginBottom: 0 }}>
                  {LABEL_PAPEL[r.papel]}
                  {r.detalhe && r.detalhe !== LABEL_PAPEL[r.papel] ? ` · ${r.detalhe}` : ""}
                  {r.cidade ? ` · ${r.cidade}` : ""}
                </p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
