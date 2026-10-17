import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Resultado = {
  id: string;
  nome: string;
  papel: "corretor";
  cidade: string | null;
  detalhe: string | null;
};

type CorretorRow = {
  profile_id: string;
  creci: string | null;
  cidade: string | null;
  profiles: { nome: string } | null;
};

// Busca de corretor para o cliente — mesma ideia das 3 abas do AppBarber
// (nome, cidade, "próximas"), sem distância real: ver comentário na
// migração 0046 sobre essa limitação honesta.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("modo") === "cidade" ? "cidade" : "nome";
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const supabase = await createClient();
  const termo = `%${q}%`;

  let corretorQuery = supabase
    .from("corretor_perfis")
    .select("profile_id, creci, cidade, profiles!corretor_perfis_profile_id_fkey!inner(nome)")
    .limit(12);
  corretorQuery =
    modo === "cidade"
      ? corretorQuery.ilike("cidade", termo)
      : corretorQuery.ilike("profiles.nome", termo);

  const { data: dadosCorretores } = await corretorQuery;
  const corretores = (dadosCorretores ?? []) as unknown as CorretorRow[];

  const resultados: Resultado[] = corretores.map((r) => ({
    id: r.profile_id,
    nome: r.profiles?.nome ?? "Corretor",
    papel: "corretor" as const,
    cidade: r.cidade,
    detalhe: r.creci ? `CRECI ${r.creci}` : null,
  }));

  return NextResponse.json({ resultados });
}
