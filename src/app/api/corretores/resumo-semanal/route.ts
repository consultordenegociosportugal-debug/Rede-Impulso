import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarResumoSemanalWhatsapp } from "@/lib/whatsapp";

// Resumo semanal pro corretor via WhatsApp — toda segunda de manhã (ver
// vercel.json), reaproveitando a mesma integração dos avisos de visita.
// Olha a semana anterior inteira (segunda a domingo que acabou de passar),
// não a semana corrente, porque a corrida roda logo no início dela.
function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

function segundaAnterior(agora: Date): Date {
  const diaSemana = agora.getDay(); // 0 = domingo
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - diasDesdeSegunda - 7);
  return inicio;
}

type CorretorRow = {
  id: string;
  nome: string;
  telefone: string | null;
};

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  const inicioSemana = segundaAnterior(new Date());
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(fimSemana.getDate() + 7);

  // Resumo é só pra quem é corretor de verdade (tem linha em
  // corretor_perfis) — mesma referência usada em /buscar-profissionais e
  // nas policies de RLS, pra não mandar pra um comprador ou gestor.
  const { data: corretoresData } = await supabase
    .from("profiles")
    .select("id, nome, telefone, corretor_perfis!inner(profile_id)")
    .eq("role", "corretor")
    .not("telefone", "is", null);

  const corretores = (corretoresData ?? []) as unknown as CorretorRow[];

  let enviados = 0;
  let semTelefone = 0;

  for (const corretor of corretores) {
    if (!corretor.telefone) {
      semTelefone += 1;
      continue;
    }

    const { count: total } = await supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("corretor_id", corretor.id)
      .neq("status", "cancelada")
      .gte("data_hora", inicioSemana.toISOString())
      .lt("data_hora", fimSemana.toISOString());

    const { count: confirmadas } = await supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("corretor_id", corretor.id)
      .in("status", ["confirmada", "realizada"])
      .gte("data_hora", inicioSemana.toISOString())
      .lt("data_hora", fimSemana.toISOString());

    await enviarResumoSemanalWhatsapp({
      telefone: corretor.telefone,
      nomeCorretor: corretor.nome,
      totalVisitas: total ?? 0,
      confirmadas: confirmadas ?? 0,
    });
    enviados += 1;
  }

  return NextResponse.json({ ok: true, enviados, sem_telefone: semTelefone });
}
