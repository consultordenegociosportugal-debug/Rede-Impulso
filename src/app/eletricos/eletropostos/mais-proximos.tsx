"use client";

import { useEffect, useState } from "react";
import { distanciaKm, formatarDistancia, urlRota, type Coords } from "@/lib/geo";

type Posto = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  conectores: string[];
  potencia_kw: number | null;
  preco_kwh: number | null;
  operadora: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "badge-primary" },
  em_manutencao: { label: "Em manutenção", className: "badge-amber" },
  inativo: { label: "Inativo", className: "badge-coral" },
};

const CONECTOR_LABEL: Record<string, string> = {
  tipo2: "Tipo 2",
  ccs2: "CCS2",
  chademo: "CHAdeMO",
  tesla: "Tesla",
  j1772: "J1772",
};

type StatusLocalizacao = "buscando" | "ok" | "negado" | "indisponivel";

export function EletropostosMaisProximos({ postos }: { postos: Posto[] }) {
  const [status, setStatus] = useState<StatusLocalizacao>("buscando");
  const [minhaPosicao, setMinhaPosicao] = useState<Coords | null>(null);

  function pedirLocalizacao() {
    if (!navigator.geolocation) {
      setStatus("indisponivel");
      return;
    }
    setStatus("buscando");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMinhaPosicao({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("ok");
      },
      (erro) => {
        setStatus(erro.code === erro.PERMISSION_DENIED ? "negado" : "indisponivel");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    // Adiada pro próximo tick: pedir geolocalização (que pode acionar
    // setState de imediato, ex. "sem suporte") direto no corpo do efeito
    // dispara renders em cascata.
    const id = setTimeout(pedirLocalizacao, 0);
    return () => clearTimeout(id);
  }, []);

  if (status !== "ok" || !minhaPosicao) {
    return (
      <>
        <div className="card mb-24" style={{ textAlign: "center", padding: "32px 20px" }}>
          {status === "buscando" && <p className="muted" style={{ margin: 0 }}>📍 Localizando você…</p>}
          {status === "negado" && (
            <>
              <p style={{ margin: "0 0 8px" }}>Permita o acesso à localização para ver o eletroposto mais próximo.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={pedirLocalizacao}>
                Tentar de novo
              </button>
            </>
          )}
          {status === "indisponivel" && (
            <p className="muted" style={{ margin: 0 }}>
              Não conseguimos obter sua localização neste dispositivo. Veja a lista completa abaixo.
            </p>
          )}
        </div>
        <ListaEletropostos postos={postos} />
      </>
    );
  }

  const comCoordenadas = postos
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      posto: p,
      distancia: distanciaKm(minhaPosicao, { lat: p.latitude!, lng: p.longitude! }),
    }))
    .sort((a, b) => a.distancia - b.distancia);

  const semCoordenadas = postos.filter((p) => p.latitude == null || p.longitude == null);

  if (comCoordenadas.length === 0) {
    return (
      <>
        <div className="card mb-24" style={{ textAlign: "center", padding: "24px 20px" }}>
          <p className="muted" style={{ margin: 0 }}>
            Ainda nenhum eletroposto com localização cadastrada por perto. Veja a lista completa abaixo.
          </p>
        </div>
        <ListaEletropostos postos={postos} />
      </>
    );
  }

  const [maisProximo, ...resto] = comCoordenadas;

  return (
    <>
      <div className="card mb-24" style={{ borderColor: "var(--primary)" }}>
        <span className="badge badge-primary">📍 Mais próximo de você</span>
        <div style={{ fontWeight: 700, fontSize: 19, marginTop: 10 }}>{maisProximo.posto.nome}</div>
        <div className="muted" style={{ fontSize: 13.5 }}>
          {maisProximo.posto.endereco} · {maisProximo.posto.cidade}/{maisProximo.posto.estado}
        </div>
        <div className="mono" style={{ fontSize: 16, marginTop: 8 }}>
          a {formatarDistancia(maisProximo.distancia)}
        </div>
        <a
          href={urlRota({ lat: maisProximo.posto.latitude!, lng: maisProximo.posto.longitude! })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-block mt-12"
        >
          Traçar rota →
        </a>
      </div>

      {resto.length > 0 && (
        <div className="grid grid-3">
          {resto.map(({ posto, distancia }) => (
            <CardEletroposto key={posto.id} posto={posto} distancia={distancia} />
          ))}
          {semCoordenadas.map((posto) => (
            <CardEletroposto key={posto.id} posto={posto} />
          ))}
        </div>
      )}
    </>
  );
}

function ListaEletropostos({ postos }: { postos: Posto[] }) {
  if (postos.length === 0) return null;
  return (
    <div className="grid grid-3">
      {postos.map((posto) => (
        <CardEletroposto key={posto.id} posto={posto} />
      ))}
    </div>
  );
}

function CardEletroposto({ posto, distancia }: { posto: Posto; distancia?: number }) {
  const st = STATUS_LABEL[posto.status] ?? { label: posto.status, className: "badge-outline" };
  return (
    <div className="card">
      <div className="flex between items-center">
        <span className={`badge ${st.className}`}>{st.label}</span>
        {distancia != null && <span className="mono hint">{formatarDistancia(distancia)}</span>}
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{posto.nome}</div>
      <div className="muted" style={{ fontSize: 13 }}>
        {posto.endereco} · {posto.cidade}/{posto.estado}
      </div>
      {posto.operadora && <div className="hint" style={{ marginTop: 6 }}>Operadora: {posto.operadora}</div>}
      {posto.conectores.length > 0 && (
        <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
          {posto.conectores.map((c) => (
            <span key={c} className="badge badge-outline">
              {CONECTOR_LABEL[c] ?? c}
            </span>
          ))}
        </div>
      )}
      <div className="mono mt-8" style={{ fontSize: 13.5 }}>
        {posto.potencia_kw ? `${posto.potencia_kw} kW` : "Potência não informada"}
        {posto.preco_kwh ? ` · R$ ${posto.preco_kwh}/kWh` : ""}
      </div>
      {posto.latitude != null && posto.longitude != null && (
        <a
          href={urlRota({ lat: posto.latitude, lng: posto.longitude })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm mt-8"
          style={{ display: "inline-flex" }}
        >
          Traçar rota →
        </a>
      )}
    </div>
  );
}
