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

const FUSO = "America/Sao_Paulo";

// `agora.getDay()` + `setHours(0,0,0,0)` usam o fuso do PROCESSO (UTC na
// Vercel), não o de Brasília — a corrida roda 11h UTC (8h em Brasília),
// então "meia-noite" calculada assim caía 3h adiantada: a janela da
// semana passada incluía 21h-23h59 de domingo retrasado por engano.
function diaDaSemanaNoFuso(instante: Date): number {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short" }).format(
    instante,
  );
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nome);
}

function hojeNoFuso(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(instante);
}

// Soma (ou subtrai, com n negativo) dias a uma data yyyy-mm-dd — opera só
// no calendário (nunca num instante real), então Date.UTC normalizar o
// estouro de mês/ano sozinho não introduz nenhuma ambiguidade de fuso.
function somarDias(dataISO: string, n: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function segundaAnteriorIso(agora: Date): string {
  const diaSemana = diaDaSemanaNoFuso(agora);
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const dataSegunda = somarDias(hojeNoFuso(agora), -diasDesdeSegunda - 7);
  return `${dataSegunda}T00:00:00-03:00`;
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

  const inicioSemanaIso = segundaAnteriorIso(new Date());
  const fimSemanaIso = `${somarDias(inicioSemanaIso.slice(0, 10), 7)}T00:00:00-03:00`;

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
      .gte("data_hora", inicioSemanaIso)
      .lt("data_hora", fimSemanaIso);

    const { count: confirmadas } = await supabase
      .from("visitas")
      .select("id", { count: "exact", head: true })
      .eq("corretor_id", corretor.id)
      .in("status", ["confirmada", "realizada"])
      .gte("data_hora", inicioSemanaIso)
      .lt("data_hora", fimSemanaIso);

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
