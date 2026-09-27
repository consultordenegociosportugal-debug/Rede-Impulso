"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { distanciaKm, formatarDistancia, urlRota, type Coords } from "@/lib/geo";
import { TIPOS_APOIO, urlMapaEstatico, type PontoMapa, type TipoApoio } from "@/lib/motorista/apoio";

type StatusLocalizacao = "buscando" | "ok" | "negado" | "indisponivel";

const LIMITE_LISTA = 30;

export function MapaApoio({ pontos }: { pontos: PontoMapa[] }) {
  const [status, setStatus] = useState<StatusLocalizacao>("buscando");
  const [minhaPosicao, setMinhaPosicao] = useState<Coords | null>(null);
  const [tipo, setTipo] = useState<TipoApoio | "todos">("todos");
  const [cidade, setCidade] = useState("");

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
      (erro) => setStatus(erro.code === erro.PERMISSION_DENIED ? "negado" : "indisponivel"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    // Mesmo cuidado de eletricos/eletropostos/mais-proximos.tsx: adia para
    // o próximo tick para não disparar setState direto no corpo do efeito.
    const id = setTimeout(pedirLocalizacao, 0);
    return () => clearTimeout(id);
  }, []);

  const visiveis = useMemo(() => {
    const termo = cidade.trim().toLowerCase();
    const filtrados = pontos.filter(
      (p) => (tipo === "todos" || p.tipo === tipo) && (!termo || p.cidade.toLowerCase().includes(termo)),
    );
    if (!minhaPosicao) return filtrados.map((ponto) => ({ ponto, distancia: null as number | null }));
    return filtrados
      .map((ponto) => ({ ponto, distancia: distanciaKm(minhaPosicao, { lat: ponto.lat, lng: ponto.lng }) }))
      .sort((a, b) => a.distancia - b.distancia);
  }, [pontos, tipo, cidade, minhaPosicao]);

  const tiposPresentes = new Set(pontos.map((p) => p.tipo));
  const noMapa = visiveis.slice(0, 9);
  const mapa = urlMapaEstatico(
    minhaPosicao,
    noMapa.map(({ ponto }) => ({ lat: ponto.lat, lng: ponto.lng, cor: TIPOS_APOIO[ponto.tipo].cor })),
  );

  return (
    <>
      <Nav active="/motorista/apoio" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Rede Impulso Motorista</span>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Mapa de apoio</h1>
            <p className="muted" style={{ margin: 0 }}>
              Recarga, GNV, banheiro, descanso, comida e lavagem perto de você — indicados e avaliados por
              motoristas.
            </p>
          </div>
          <Link href="/motorista/apoio/adicionar" className="btn btn-primary btn-sm">
            + Indicar um ponto
          </Link>
        </div>

        <div className="flex gap-8 mt-24" style={{ flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn btn-sm ${tipo === "todos" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTipo("todos")}
          >
            Todos
          </button>
          {(Object.keys(TIPOS_APOIO) as TipoApoio[])
            .filter((t) => tiposPresentes.has(t) || t === tipo)
            .map((t) => (
              <button
                key={t}
                type="button"
                className={`btn btn-sm ${tipo === t ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTipo(t)}
              >
                {TIPOS_APOIO[t].icone} {TIPOS_APOIO[t].rotulo}
              </button>
            ))}
        </div>

        <div className="flex gap-8 mt-16 items-center" style={{ flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Filtrar por cidade"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            style={{ width: 220 }}
          />
          <span className="hint" style={{ margin: 0 }}>
            {status === "buscando" && "📍 Localizando você…"}
            {status === "ok" && "📍 Ordenado pela distância até você"}
            {status === "negado" && (
              <>
                Localização bloqueada —{" "}
                <button type="button" className="btn btn-ghost btn-sm" onClick={pedirLocalizacao}>
                  tentar de novo
                </button>
              </>
            )}
            {status === "indisponivel" && "Sem localização neste aparelho — use o filtro por cidade."}
          </span>
        </div>

        {mapa && noMapa.length > 0 && (
          <div className="card mt-16" style={{ padding: 0, overflow: "hidden" }}>
            {/* Imagem externa do Google Static Maps — next/image exigiria
                liberar o domínio na config só para isto. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapa}
              alt={`Mapa com os ${noMapa.length} pontos mais próximos`}
              style={{ width: "100%", display: "block" }}
            />
            <p className="hint" style={{ margin: 0, padding: "8px 16px" }}>
              {minhaPosicao ? "V = você. " : ""}Os números do mapa são os primeiros da lista abaixo.
            </p>
          </div>
        )}

        {visiveis.length === 0 ? (
          <div className="card mt-16" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: "0 0 12px" }}>
              {pontos.length === 0
                ? "O mapa está começando agora — seja o primeiro a indicar um ponto de apoio."
                : "Nada com esse filtro ainda."}
            </p>
            <Link href="/motorista/apoio/adicionar" className="btn btn-primary btn-sm">
              Indicar um ponto
            </Link>
          </div>
        ) : (
          <div className="grid grid-3 mt-16">
            {visiveis.slice(0, LIMITE_LISTA).map(({ ponto, distancia }, i) => (
              <CardPonto key={`${ponto.fonte}-${ponto.id}`} ponto={ponto} distancia={distancia} numero={i < 9 ? i + 1 : null} />
            ))}
          </div>
        )}

        {visiveis.length > LIMITE_LISTA && (
          <p className="hint mt-16">
            Mostrando os {LIMITE_LISTA} {minhaPosicao ? "mais próximos" : "primeiros"} de {visiveis.length}. Use o
            filtro por tipo ou cidade para refinar.
          </p>
        )}
      </div>

      <Footer />
    </>
  );
}

function CardPonto({
  ponto,
  distancia,
  numero,
}: {
  ponto: PontoMapa;
  distancia: number | null;
  numero: number | null;
}) {
  const tipo = TIPOS_APOIO[ponto.tipo];
  const detalhesHref = ponto.fonte === "apoio" ? `/motorista/apoio/${ponto.id}` : "/eletricos/eletropostos";

  return (
    <div className="card">
      <div className="flex between items-center">
        <span className="badge badge-outline">
          {numero ? `${numero} · ` : ""}
          {tipo.icone} {tipo.rotulo}
        </span>
        {distancia !== null && <span className="mono hint">{formatarDistancia(distancia)}</span>}
      </div>
      <div style={{ fontWeight: 600, fontSize: 15, marginTop: 8 }}>{ponto.nome}</div>
      <div className="muted" style={{ fontSize: 13 }}>
        {ponto.endereco} · {ponto.cidade}/{ponto.estado}
      </div>
      <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
        {ponto.aberto24h && <span className="badge badge-primary">24h</span>}
        {ponto.gratuito && <span className="badge badge-primary">Grátis</span>}
        {ponto.notaMedia !== null && (
          <span className="badge badge-amber">
            ★ {ponto.notaMedia.toFixed(1)} ({ponto.totalAvaliacoes})
          </span>
        )}
      </div>
      {ponto.detalhe && (
        <div className="hint" style={{ marginTop: 6 }}>
          {ponto.detalhe}
        </div>
      )}
      {ponto.aproximada && (
        <div className="hint" style={{ marginTop: 4 }}>
          📍 Localização aproximada — confira o endereço
        </div>
      )}
      <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
        <a
          href={urlRota({ lat: ponto.lat, lng: ponto.lng })}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
        >
          Traçar rota
        </a>
        <Link href={detalhesHref} className="btn btn-ghost btn-sm">
          {ponto.fonte === "apoio" ? "Avaliar / detalhes" : "Ver eletropostos"}
        </Link>
      </div>
    </div>
  );
}
