import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { paraE164 } from "@/lib/telefone";

const MAX_CONTATOS_POR_IMPORTACAO = 500;

type ContatoBruto = { nome?: string; telefone?: string; email?: string };

// Importação em massa da base do corretor — item pedido direto por
// corretor testando o sistema ("corretor importe a sua base"). v1
// básico de propósito: cola uma lista (nome, telefone, e-mail opcional
// — um contato por linha), sem upload de arquivo. Vira cliente_avulso,
// igual quem o corretor cadastra um por um em /painel-negocios/
// clientes; não cria nenhuma visita.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (perfil?.role !== "corretor") {
    return NextResponse.json({ erro: "Só corretores podem importar clientes." }, { status: 403 });
  }

  const { contatos } = (await request.json()) as { contatos?: ContatoBruto[] };
  if (!Array.isArray(contatos) || contatos.length === 0) {
    return NextResponse.json({ erro: "Nenhum contato pra importar." }, { status: 400 });
  }
  if (contatos.length > MAX_CONTATOS_POR_IMPORTACAO) {
    return NextResponse.json(
      { erro: `Máximo de ${MAX_CONTATOS_POR_IMPORTACAO} contatos por importação.` },
      { status: 400 },
    );
  }

  // Dedup contra quem já está cadastrado — mesma lógica de telefone
  // normalizado usada em /api/visitas/agendar, pra não duplicar quem já
  // é cliente só porque reimportou a mesma planilha.
  const { data: existentes } = await supabase
    .from("clientes_avulsos")
    .select("telefone")
    .eq("corretor_id", user.id)
    .not("telefone", "is", null);
  const telefonesExistentes = new Set(
    (existentes ?? []).map((c) => paraE164(c.telefone!)).filter((t): t is string => Boolean(t)),
  );

  const paraInserir: { corretor_id: string; nome: string; telefone: string | null; email: string | null }[] =
    [];
  const telefonesNestaImportacao = new Set<string>();
  let semNome = 0;
  let duplicados = 0;
  let telefoneInvalido = 0;

  for (const contato of contatos) {
    const nome = contato.nome?.trim().slice(0, 120);
    if (!nome) {
      semNome += 1;
      continue;
    }

    const telefoneDigitado = contato.telefone?.trim() || null;
    const telefoneE164 = telefoneDigitado ? paraE164(telefoneDigitado) : null;
    if (telefoneE164 && (telefonesExistentes.has(telefoneE164) || telefonesNestaImportacao.has(telefoneE164))) {
      duplicados += 1;
      continue;
    }
    if (telefoneE164) telefonesNestaImportacao.add(telefoneE164);

    // Parser do front é só heurística (campo sem "@" depois do nome vira
    // "telefone" — não há coluna de verdade). Sem esta checagem, uma linha
    // colada com a coluna fora de ordem (ex.: bairro em vez de telefone)
    // gravava esse texto como se fosse o telefone do cliente, sem avisar
    // ninguém — e esse telefone nunca seria usado pra WhatsApp, já que
    // paraE164 também falha ao tentar mandar a mensagem depois.
    const telefoneReconhecido = telefoneDigitado && !telefoneE164 ? null : telefoneDigitado;
    if (telefoneDigitado && !telefoneE164) telefoneInvalido += 1;

    paraInserir.push({
      corretor_id: user.id,
      nome,
      telefone: telefoneReconhecido,
      email: contato.email?.trim().slice(0, 200) || null,
    });
  }

  if (paraInserir.length === 0) {
    return NextResponse.json({ ok: true, importados: 0, duplicados, sem_nome: semNome, telefone_invalido: telefoneInvalido });
  }

  const { error } = await supabase.from("clientes_avulsos").insert(paraInserir);
  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    importados: paraInserir.length,
    duplicados,
    sem_nome: semNome,
    telefone_invalido: telefoneInvalido,
  });
}
