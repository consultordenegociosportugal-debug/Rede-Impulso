import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodificarEndereco } from "@/lib/geocodificar";

// Salva o endereço da organização JÁ geocodificado (lat/lng) — chamado
// pelo admin tanto ao cadastrar quanto ao editar (ver nova-organizacao-
// form.tsx e editar-endereco-organizacao.tsx). Centraliza aqui porque
// geocodificarEndereco() só roda no servidor (Nominatim exige
// User-Agent próprio, que o navegador não deixa sobrescrever).
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!perfil?.is_admin) {
    return NextResponse.json({ erro: "Só administradores podem editar o catálogo." }, { status: 403 });
  }

  let corpo: { organizacaoId?: string; endereco?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const { organizacaoId, endereco } = corpo;
  if (!organizacaoId) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const enderecoLimpo = endereco?.trim() || null;
  const coordenadas = enderecoLimpo ? await geocodificarEndereco(enderecoLimpo) : null;

  const { error } = await supabase
    .from("organizacoes_catalogo")
    .update({
      endereco: enderecoLimpo,
      latitude: coordenadas?.latitude ?? null,
      longitude: coordenadas?.longitude ?? null,
    })
    .eq("id", organizacaoId);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    geocodificado: Boolean(coordenadas),
    aviso: enderecoLimpo && !coordenadas ? "Endereço salvo, mas não foi reconhecido no mapa." : null,
  });
}
