import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";
import { enviarResumoSemanalWhatsapp } from "@/lib/whatsapp";
import { escaparHtml } from "@/lib/escapar-html";
import { somarDias } from "@/lib/data";

// Resumo semanal pro corretor — toda segunda de manhã (ver vercel.json).
// Olha a semana anterior inteira (segunda a domingo que acabou de
// passar), não a semana corrente, porque a corrida roda logo no início
// dela.
//
// Diferente dos avisos de agendar/cancelar (imediatos, disparados na
// hora que o cliente age — não mexemos nisso aqui), este é o retrato da
// semana: quanto deu, como foi em relação à anterior, qual foi o dia
// mais forte e, se teve cancelamento demais, os motivos que os clientes
// deixaram — não só um número solto.
function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

const FUSO = "America/Sao_Paulo";
const DIAS_SEMANA_PTBR = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const formatoDataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO });

// `agora.getDay()` + `setHours(0,0,0,0)` usam o fuso do PROCESSO (UTC na
// Vercel), não o de Brasília — a corrida roda 11h UTC (8h em Brasília),
// então "meia-noite" calculada assim caía 3h adiantada: a janela da
// semana passada incluía 21h-23h59 de domingo retrasado por engano.
function diaDaSemanaNoFuso(instante: Date): number {
  const nome = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, weekday: "short" }).format(instante);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(nome);
}

function hojeNoFuso(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(instante);
}

function segundaIso(agora: Date, semanasAtras: number): string {
  const diaSemana = diaDaSemanaNoFuso(agora);
  const diasDesdeSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  return somarDias(hojeNoFuso(agora), -diasDesdeSegunda - semanasAtras * 7);
}

type CorretorRow = { id: string; nome: string; email: string | null; telefone: string | null };
type VisitaResumo = { data_hora: string; status: string };
type EventoCancelamento = { motivo: string | null };

function diaMaisMovimentado(visitas: VisitaResumo[]): string | null {
  if (visitas.length === 0) return null;
  const contagem = new Map<number, number>();
  for (const v of visitas) {
    const dia = diaDaSemanaNoFuso(new Date(v.data_hora));
    contagem.set(dia, (contagem.get(dia) ?? 0) + 1);
  }
  let melhorDia = 0;
  let melhorContagem = -1;
  for (const [dia, n] of contagem) {
    if (n > melhorContagem) {
      melhorDia = dia;
      melhorContagem = n;
    }
  }
  return DIAS_SEMANA_PTBR[melhorDia];
}

function construirMensagem(r: {
  total: number;
  confirmadas: number;
  canceladas: number;
  realizadas: number;
  delta: number;
  diaForte: string | null;
}): string {
  if (r.total === 0) {
    return "Essa semana não teve nenhum agendamento. Compartilhe seu link de agendamento com mais clientes — quanto mais gente souber que dá pra marcar direto com você, mais visitas aparecem.";
  }
  const partes: string[] = [];
  if (r.delta > 0) partes.push(`${r.delta} a mais que a semana passada`);
  else if (r.delta < 0) partes.push(`${Math.abs(r.delta)} a menos que a semana passada`);
  else partes.push("mesmo ritmo da semana passada");
  if (r.diaForte) partes.push(`seu dia mais forte foi ${r.diaForte}`);
  if (r.canceladas > 0 && r.canceladas >= r.confirmadas + r.realizadas) {
    partes.push("o número de cancelamentos chamou atenção essa semana — vale olhar os motivos abaixo");
  }
  return partes.join(", ") + ".";
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  const agora = new Date();
  const inicioSemana = segundaIso(agora, 1);
  const fimSemana = somarDias(inicioSemana, 6);
  const inicioSemanaAnterior = segundaIso(agora, 2);
  const fimSemanaAnterior = somarDias(inicioSemanaAnterior, 6);

  const inicioSemanaTs = `${inicioSemana}T00:00:00-03:00`;
  const fimSemanaTs = `${somarDias(fimSemana, 1)}T00:00:00-03:00`;
  const inicioSemanaAnteriorTs = `${inicioSemanaAnterior}T00:00:00-03:00`;
  const fimSemanaAnteriorTs = `${somarDias(fimSemanaAnterior, 1)}T00:00:00-03:00`;

  // Resumo é só pra quem é corretor de verdade (tem linha em
  // corretor_perfis) — mesma referência usada em /buscar-profissionais e
  // nas policies de RLS, pra não mandar pra um comprador ou gestor.
  //
  // ?corretor_id=... restringe a um único corretor — pra testar manualmente
  // sem disparar resumo pra toda a base; a corrida semanal de verdade
  // (vercel.json) nunca passa esse parâmetro.
  const corretorIdFiltro = new URL(request.url).searchParams.get("corretor_id");
  let query = supabase
    .from("profiles")
    .select("id, nome, email, telefone, corretor_perfis!inner(profile_id)")
    .eq("role", "corretor");
  if (corretorIdFiltro) query = query.eq("id", corretorIdFiltro);
  const { data: corretoresData } = await query;

  const corretores = (corretoresData ?? []) as unknown as CorretorRow[];

  if (corretores.length === 0) {
    return NextResponse.json({ ok: true, corretores: 0 });
  }

  const emailAtivo = resendConfigurado();
  const resend = emailAtivo ? getResend()! : null;

  let enviados = 0;
  let semContato = 0;

  for (const corretor of corretores) {
    if (!corretor.email && !corretor.telefone) {
      semContato += 1;
      continue;
    }

    const [{ data: dadosSemana }, { count: totalAnterior }, { data: dadosEventos }] = await Promise.all([
      supabase
        .from("visitas")
        .select("data_hora, status")
        .eq("corretor_id", corretor.id)
        .gte("data_hora", inicioSemanaTs)
        .lt("data_hora", fimSemanaTs),
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("corretor_id", corretor.id)
        .gte("data_hora", inicioSemanaAnteriorTs)
        .lt("data_hora", fimSemanaAnteriorTs),
      supabase
        .from("visitas_eventos")
        .select("motivo")
        .eq("corretor_id", corretor.id)
        .eq("status_novo", "cancelada")
        .not("motivo", "is", null)
        .gte("data_hora_visita", inicioSemanaTs)
        .lt("data_hora_visita", fimSemanaTs)
        .limit(5),
    ]);

    const visitasSemana = (dadosSemana ?? []) as unknown as VisitaResumo[];
    const eventosCancelamento = (dadosEventos ?? []) as unknown as EventoCancelamento[];
    const contar = (status: string) => visitasSemana.filter((v) => v.status === status).length;

    const resumo = {
      total: visitasSemana.length,
      confirmadas: contar("confirmada"),
      canceladas: contar("cancelada"),
      realizadas: contar("realizada"),
      naoCompareceu: contar("nao_compareceu"),
      delta: visitasSemana.length - (totalAnterior ?? 0),
      diaForte: diaMaisMovimentado(visitasSemana),
    };

    const mensagemInteligente = construirMensagem(resumo);
    const periodo = `${formatoDataCurta.format(new Date(`${inicioSemana}T12:00:00-03:00`))} a ${formatoDataCurta.format(new Date(`${fimSemana}T12:00:00-03:00`))}`;

    let emailOk = !corretor.email;
    if (corretor.email && resend) {
      try {
        const { error } = await resend.emails.send({
          from: EMAIL_REMETENTE,
          to: corretor.email,
          subject: `Seu resumo da semana (${periodo}) na Rede Impulso`,
          html: `
            <p>Olá, ${escaparHtml(corretor.nome)}.</p>
            <p>Aqui vai o resumo da sua semana (${periodo}) na Rede Impulso:</p>
            <ul>
              <li><strong>${resumo.total}</strong> visita(s) agendada(s)</li>
              <li><strong>${resumo.confirmadas}</strong> confirmada(s)</li>
              <li><strong>${resumo.realizadas}</strong> realizada(s)</li>
              <li><strong>${resumo.canceladas}</strong> cancelada(s)</li>
              ${resumo.naoCompareceu > 0 ? `<li><strong>${resumo.naoCompareceu}</strong> cliente(s) não compareceu(ram)</li>` : ""}
            </ul>
            <p>${escaparHtml(mensagemInteligente)}</p>
            ${
              eventosCancelamento.length > 0
                ? `<p><strong>Motivos de cancelamento informados:</strong></p><ul>${eventosCancelamento
                    .map((e) => `<li>${escaparHtml(e.motivo ?? "")}</li>`)
                    .join("")}</ul>`
                : ""
            }
            ${rodapeTransacionalHtml()}
          `,
        });
        emailOk = !error;
      } catch {
        emailOk = false;
      }
    }

    let whatsappOk = !corretor.telefone;
    if (corretor.telefone) {
      whatsappOk = await enviarResumoSemanalWhatsapp({
        telefone: corretor.telefone,
        nomeCorretor: corretor.nome,
        totalVisitas: resumo.total,
        confirmadas: resumo.confirmadas,
      });
    }

    if (emailOk || whatsappOk) enviados += 1;
  }

  return NextResponse.json({ ok: true, corretores: corretores.length, enviados, sem_contato: semContato });
}
