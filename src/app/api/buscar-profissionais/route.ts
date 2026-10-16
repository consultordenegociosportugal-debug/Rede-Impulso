import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Papel = "corretor" | "imobiliaria" | "construtora";

type Resultado = {
  id: string;
  nome: string;
  papel: Papel;
  cidade: string | null;
  detalhe: string | null;
};

type CorretorRow = {
  profile_id: string;
  creci: string | null;
  cidade: string | null;
  profiles: { nome: string } | null;
};

type EmpresaRow = {
  profile_id: string;
  nome_fantasia: string | null;
  cidade: string | null;
  profiles: { nome: string } | null;
};

// Busca de corretor/imobiliária/construtora para o cliente — mesma ideia
// das 3 abas do AppBarber (nome, cidade, "próximas"), sem distância real:
// ver comentário na migração 0046 sobre essa limitação honesta.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("modo") === "cidade" ? "cidade" : "nome";
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ resultados: [] });
  }

  const supabase = await createClient();
  const termo = `%${q}%`;

  // corretor_perfis tem duas FKs pra profiles (profile_id e
  // imobiliaria_id) — sem apontar qual, o PostgREST recusa o embed por
  // ambiguidade (erro PGRST201).
  let corretorQuery = supabase
    .from("corretor_perfis")
    .select("profile_id, creci, cidade, profiles!corretor_perfis_profile_id_fkey!inner(nome)")
    .limit(12);
  corretorQuery =
    modo === "cidade"
      ? corretorQuery.ilike("cidade", termo)
      : corretorQuery.ilike("profiles.nome", termo);

  let imobiliariaQuery = supabase
    .from("imobiliaria_perfis")
    .select("profile_id, nome_fantasia, cidade, profiles!inner(nome)")
    .limit(12);
  imobiliariaQuery =
    modo === "cidade"
      ? imobiliariaQuery.ilike("cidade", termo)
      : imobiliariaQuery.ilike("nome_fantasia", termo);

  let construtoraQuery = supabase
    .from("construtora_perfis")
    .select("profile_id, nome_fantasia, cidade, profiles!inner(nome)")
    .limit(12);
  construtoraQuery =
    modo === "cidade"
      ? construtoraQuery.ilike("cidade", termo)
      : construtoraQuery.ilike("nome_fantasia", termo);

  const [{ data: dadosCorretores }, { data: dadosImobiliarias }, { data: dadosConstrutoras }] =
    await Promise.all([corretorQuery, imobiliariaQuery, construtoraQuery]);

  const corretores = (dadosCorretores ?? []) as unknown as CorretorRow[];
  const imobiliarias = (dadosImobiliarias ?? []) as unknown as EmpresaRow[];
  const construtoras = (dadosConstrutoras ?? []) as unknown as EmpresaRow[];

  const resultados: Resultado[] = [
    ...corretores.map((r) => ({
      id: r.profile_id,
      nome: r.profiles?.nome ?? "Corretor",
      papel: "corretor" as const,
      cidade: r.cidade,
      detalhe: r.creci ? `CRECI ${r.creci}` : null,
    })),
    ...imobiliarias.map((r) => ({
      id: r.profile_id,
      nome: r.nome_fantasia || r.profiles?.nome || "Imobiliária",
      papel: "imobiliaria" as const,
      cidade: r.cidade,
      detalhe: "Imobiliária",
    })),
    ...construtoras.map((r) => ({
      id: r.profile_id,
      nome: r.nome_fantasia || r.profiles?.nome || "Construtora",
      papel: "construtora" as const,
      cidade: r.cidade,
      detalhe: "Construtora/incorporadora",
    })),
  ];

  return NextResponse.json({ resultados });
}
