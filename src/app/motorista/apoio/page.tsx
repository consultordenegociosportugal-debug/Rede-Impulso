import { createClient } from "@/lib/supabase/server";
import type { PontoMapa } from "@/lib/motorista/apoio";
import { MapaApoio } from "./mapa-apoio";

// Mapa de apoio do motorista (migração 0035): pontos de apoio da
// comunidade + eletropostos (0032) no mesmo mapa, ordenados pela
// distância até o motorista.

type ApoioRow = {
  id: string;
  tipo: PontoMapa["tipo"];
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  aberto_24h: boolean;
  gratuito: boolean;
  horario: string | null;
  nota_media: number | null;
  total_avaliacoes: number;
};

type EletropostoRow = {
  id: string;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  latitude: number;
  longitude: number;
  potencia_kw: number | null;
  preco_kwh: number | null;
  operadora: string | null;
};

export default async function MapaApoioPage() {
  const supabase = await createClient();

  const [{ data: apoio }, { data: postos }] = await Promise.all([
    supabase
      .from("pontos_apoio_resumo")
      .select("id, tipo, nome, endereco, cidade, estado, latitude, longitude, aberto_24h, gratuito, horario, nota_media, total_avaliacoes")
      .eq("ativo", true)
      .limit(1000),
    supabase
      .from("ev_eletropostos")
      .select("id, nome, endereco, cidade, estado, latitude, longitude, potencia_kw, preco_kwh, operadora")
      .neq("status", "inativo")
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(1000),
  ]);

  const pontos: PontoMapa[] = [
    ...((apoio ?? []) as ApoioRow[]).map((p) => ({
      id: p.id,
      fonte: "apoio" as const,
      tipo: p.tipo,
      nome: p.nome,
      endereco: p.endereco,
      cidade: p.cidade,
      estado: p.estado,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      aberto24h: p.aberto_24h,
      gratuito: p.gratuito,
      detalhe: p.horario,
      notaMedia: p.nota_media === null ? null : Number(p.nota_media),
      totalAvaliacoes: p.total_avaliacoes,
    })),
    ...((postos ?? []) as EletropostoRow[]).map((p) => ({
      id: p.id,
      fonte: "eletroposto" as const,
      tipo: "eletroposto" as const,
      nome: p.nome,
      endereco: p.endereco,
      cidade: p.cidade,
      estado: p.estado,
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      aberto24h: false,
      gratuito: false,
      detalhe:
        [p.operadora, p.potencia_kw ? `${p.potencia_kw} kW` : null, p.preco_kwh ? `R$ ${p.preco_kwh}/kWh` : null]
          .filter(Boolean)
          .join(" · ") || null,
      notaMedia: null,
      totalAvaliacoes: 0,
    })),
  ];

  return <MapaApoio pontos={pontos} />;
}
