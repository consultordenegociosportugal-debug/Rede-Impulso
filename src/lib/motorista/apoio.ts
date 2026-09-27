import type { Coords } from "@/lib/geo";

// Mapa de apoio do motorista (migração 0035). "eletroposto" não é um tipo
// de pontos_apoio — vem de ev_eletropostos — mas aparece junto no mapa.

export const TIPOS_APOIO = {
  eletroposto: { rotulo: "Eletroposto", icone: "⚡", cor: "0x00e6a8" },
  gnv: { rotulo: "GNV", icone: "🔵", cor: "0x3b82f6" },
  banheiro: { rotulo: "Banheiro", icone: "🚻", cor: "0xa855f7" },
  descanso: { rotulo: "Descanso", icone: "😴", cor: "0x6366f1" },
  alimentacao: { rotulo: "Alimentação", icone: "🍽️", cor: "0xffb020" },
  lavagem: { rotulo: "Lavagem", icone: "🧽", cor: "0x06b6d4" },
  borracharia: { rotulo: "Borracharia", icone: "🛞", cor: "0x94a3b8" },
  outro: { rotulo: "Outro", icone: "📍", cor: "0xff6b5b" },
} as const;

export type TipoApoio = keyof typeof TIPOS_APOIO;

// Tipos que o motorista pode cadastrar em pontos_apoio (eletroposto tem
// formulário próprio em /eletricos/eletropostos/adicionar).
export const TIPOS_CADASTRAVEIS = Object.keys(TIPOS_APOIO).filter((t) => t !== "eletroposto") as Exclude<
  TipoApoio,
  "eletroposto"
>[];

export type PontoMapa = {
  id: string;
  fonte: "apoio" | "eletroposto";
  tipo: TipoApoio;
  nome: string;
  endereco: string;
  cidade: string;
  estado: string;
  lat: number;
  lng: number;
  aberto24h: boolean;
  gratuito: boolean;
  detalhe: string | null;
  notaMedia: number | null;
  totalAvaliacoes: number;
};

// Imagem de mapa (Google Static Maps) com a posição do motorista e até 9
// pontos numerados — dá a noção de "onde fica" sem carregar um mapa
// interativo pago.
export function urlMapaEstatico(centro: Coords | null, pontos: { lat: number; lng: number; cor: string }[]) {
  const chave = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!chave || (pontos.length === 0 && !centro)) return null;

  const params = new URLSearchParams({ size: "640x320", scale: "2", language: "pt-BR", key: chave });
  const marcadores = pontos
    .slice(0, 9)
    .map((p, i) => `markers=${encodeURIComponent(`color:${p.cor}|label:${i + 1}|${p.lat},${p.lng}`)}`);
  if (centro) {
    marcadores.unshift(`markers=${encodeURIComponent(`color:white|label:V|${centro.lat},${centro.lng}`)}`);
  }
  if (pontos.length === 0 && centro) params.set("zoom", "14");

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}&${marcadores.join("&")}`;
}
