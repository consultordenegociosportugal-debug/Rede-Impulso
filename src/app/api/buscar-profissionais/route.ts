import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Resultado = {
  id: string;
  nome: string;
  papel: "corretor";
  cidade: string | null;
  detalhe: string | null;
  fotoUrl: string | null;
};

type CorretorRowNome = {
  profile_id: string;
  creci: string | null;
  cidades_atuacao: string[] | null;
  profiles: { nome: string; foto_url: string | null } | null;
};

type CorretorRowCidade = {
  profile_id: string;
  creci: string | null;
  cidades_atuacao: string[] | null;
  nome: string;
  foto_url: string | null;
};

// Busca de corretor para o cliente — mesma ideia das 3 abas do AppBarber
// (nome, cidade, "próximas"), sem distância real: ver comentário na
// migração 0046 sobre essa limitação honesta.
//
// Busca por cidade vira RPC (migração 0083): PostgREST não faz ILIKE
// parcial contra elementos de um text[] via filtro simples.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("modo") === "cidade" ? "cidade" : "nome";
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const supabase = await createClient();

  let resultados: Resultado[];

  if (modo === "cidade") {
    const { data } = await supabase.rpc("buscar_corretores_por_cidade", { termo: q });
    const corretores = (data ?? []) as CorretorRowCidade[];
    resultados = corretores.map((r) => ({
      id: r.profile_id,
      nome: r.nome ?? "Corretor",
      papel: "corretor" as const,
      cidade: r.cidades_atuacao?.join(", ") ?? null,
      detalhe: r.creci ? `CRECI ${r.creci}` : null,
      fotoUrl: r.foto_url ?? null,
    }));
  } else {
    const { data } = await supabase
      .from("corretor_perfis")
      .select(
        "profile_id, creci, cidades_atuacao, profiles!corretor_perfis_profile_id_fkey!inner(nome, foto_url)",
      )
      .ilike("profiles.nome", `%${q}%`)
      .limit(12);
    const corretores = (data ?? []) as unknown as CorretorRowNome[];
    resultados = corretores.map((r) => ({
      id: r.profile_id,
      nome: r.profiles?.nome ?? "Corretor",
      papel: "corretor" as const,
      cidade: r.cidades_atuacao?.join(", ") ?? null,
      detalhe: r.creci ? `CRECI ${r.creci}` : null,
      fotoUrl: r.profiles?.foto_url ?? null,
    }));
  }

  return NextResponse.json({ resultados });
}
