import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { urlRota } from "@/lib/geo";
import { textoPreco, TIPOS_APOIO, urlMapaEstatico, type TipoApoio } from "@/lib/motorista/apoio";
import { AvaliarPonto } from "./avaliar";

type Ponto = {
  id: string;
  tipo: TipoApoio;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  aberto_24h: boolean;
  gratuito: boolean;
  horario: string | null;
  observacoes: string | null;
  preco: number | null;
  preco_unidade: string | null;
  preco_atualizado_em: string | null;
  localizacao_aproximada: boolean;
  nota_media: number | null;
  total_avaliacoes: number;
  created_at: string;
};

type Avaliacao = {
  id: string;
  autor_id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  autor: { nome: string } | null;
};

const estrelas = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function PontoApoioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: pontoData }, { data: avaliacoesData }] = await Promise.all([
    supabase.from("pontos_apoio_resumo").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("pontos_apoio_avaliacoes")
      .select("id, autor_id, nota, comentario, created_at, autor:autor_id(nome)")
      .eq("ponto_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const ponto = pontoData as Ponto | null;
  const avaliacoes = (avaliacoesData ?? []) as unknown as Avaliacao[];

  if (!ponto) {
    return (
      <>
        <Nav active="/motorista/apoio" />
        <div className="wrap" style={{ textAlign: "center", paddingTop: 64, paddingBottom: 64 }}>
          <p className="muted">Ponto de apoio não encontrado.</p>
          <Link href="/motorista/apoio" className="btn btn-primary btn-sm mt-16">
            Ver o mapa de apoio
          </Link>
        </div>
        <Footer />
      </>
    );
  }

  const tipo = TIPOS_APOIO[ponto.tipo];
  const coords = { lat: Number(ponto.latitude), lng: Number(ponto.longitude) };
  const mapa = urlMapaEstatico(null, [{ ...coords, cor: tipo.cor }]);
  const minha = user ? avaliacoes.find((a) => a.autor_id === user.id) : undefined;

  return (
    <>
      <Nav active="/motorista/apoio" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/motorista/apoio" className="hint">
          ← Mapa de apoio
        </Link>

        <div className="grid grid-2 mt-16" style={{ alignItems: "start", gap: 24 }}>
          <div className="card">
            <span className="badge badge-outline">
              {tipo.icone} {tipo.rotulo}
            </span>
            <h1 style={{ fontSize: 24, margin: "10px 0 4px" }}>{ponto.nome}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {ponto.endereco} · {ponto.cidade}/{ponto.estado}
            </p>
            <div className="flex gap-8 mt-12" style={{ flexWrap: "wrap" }}>
              {ponto.aberto_24h && <span className="badge badge-primary">Aberto 24h</span>}
              {ponto.gratuito && <span className="badge badge-primary">Grátis</span>}
              {ponto.nota_media !== null && (
                <span className="badge badge-amber">
                  ★ {Number(ponto.nota_media).toFixed(1)} · {ponto.total_avaliacoes} avaliação
                  {ponto.total_avaliacoes === 1 ? "" : "ões"}
                </span>
              )}
            </div>
            {textoPreco(ponto.preco, ponto.preco_unidade, ponto.preco_atualizado_em) && (
              <p className="mono" style={{ fontSize: 18, margin: "12px 0 0" }}>
                {textoPreco(ponto.preco, ponto.preco_unidade, ponto.preco_atualizado_em)}
              </p>
            )}
            {ponto.localizacao_aproximada && (
              <p className="hint" style={{ margin: "8px 0 0" }}>
                📍 Localização aproximada (pelo CEP) — confira o endereço antes de ir.
              </p>
            )}
            {ponto.horario && (
              <p className="hint" style={{ margin: "12px 0 0" }}>
                Horário: {ponto.horario}
              </p>
            )}
            {ponto.observacoes && (
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: "12px 0 0", whiteSpace: "pre-wrap" }}>
                {ponto.observacoes}
              </p>
            )}
            <a
              href={urlRota(coords)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-block mt-16"
            >
              Traçar rota →
            </a>
          </div>

          {mapa && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Google Static Maps — ver o comentário em ../mapa-apoio.tsx. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mapa} alt={`Localização de ${ponto.nome}`} style={{ width: "100%", display: "block" }} />
            </div>
          )}
        </div>

        <div className="card mt-16">
          <strong>Avaliações de motoristas</strong>
          <AvaliarPonto
            pontoId={ponto.id}
            logado={Boolean(user)}
            notaAtual={minha?.nota ?? null}
            comentarioAtual={minha?.comentario ?? null}
          />
          {avaliacoes.length === 0 ? (
            <p className="hint" style={{ margin: "16px 0 0" }}>
              Ninguém avaliou ainda. Passou por aqui? Conte como foi.
            </p>
          ) : (
            <div className="mt-16" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {avaliacoes.map((a) => (
                <div key={a.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <p className="hint" style={{ margin: "0 0 4px" }}>
                    <span style={{ color: "var(--amber)" }}>{estrelas(a.nota)}</span> · {a.autor?.nome ?? "Motorista"} ·{" "}
                    {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {a.comentario && <p style={{ margin: 0, fontSize: 14 }}>{a.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
