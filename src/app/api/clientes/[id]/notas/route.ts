import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Notas do corretor sobre um cliente avulso — primeira peça do CRM
// (ver migração 0098). RLS em clientes_notas já restringe tudo a
// corretor_id = auth.uid(), mas o POST confere também que o
// cliente_avulso_id é mesmo de quem está logado antes de inserir —
// sem isso, nada impedia anotar num id de cliente de outro corretor
// (a nota nunca apareceria pra ninguém, mas seria lixo sem dono
// visível acumulando na tabela).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clienteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("clientes_notas")
    .select("id, texto, created_at")
    .eq("cliente_avulso_id", clienteId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ notas: data ?? [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clienteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let corpo: { texto?: string };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const texto = corpo.texto?.trim().slice(0, 2000);
  if (!texto) {
    return NextResponse.json({ erro: "Escreva alguma coisa na nota." }, { status: 400 });
  }

  const { data: cliente } = await supabase
    .from("clientes_avulsos")
    .select("corretor_id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente || cliente.corretor_id !== user.id) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("clientes_notas")
    .insert({ cliente_avulso_id: clienteId, corretor_id: user.id, texto })
    .select("id, texto, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ erro: error?.message ?? "Não foi possível salvar a nota." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, nota: data });
}
