import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, resendConfigurado, EMAIL_REMETENTE } from "@/lib/resend";
import { rodapeTransacionalHtml } from "@/lib/email-rodape";

// Job diário: avisa por e-mail quem tem o Plano Profissional ativo e
// está a poucos dias da próxima cobrança mensal — o Mercado Pago não
// manda esse aviso sozinho, e cobrar sem avisar antes é exatamente o
// tipo de coisa que gera chargeback e reclamação no Procon.
//
// O Mercado Pago não confirma cada cobrança recorrente individual por
// aqui (só a ativação inicial do preapproval, via /api/assinatura/webhook).
// Por isso `proxima_cobranca` é uma ESTIMATIVA: mensal a partir da
// ativação (ver migração 0042). Este job faz duas coisas na mesma
// passada:
//   1. Rola pra frente +1 mês quem já passou da data estimada (o ciclo
//      anterior presumivelmente já foi cobrado) e limpa o lembrete.
//   2. Manda o aviso pra quem está a até 3 dias da próxima cobrança e
//      ainda não recebeu lembrete neste ciclo.
// Protegido por CRON_SECRET — mesmo padrão de /api/radar-mercado/atualizar.

const DIAS_DE_ANTECEDENCIA = 3;

const PLANO_LABEL: Record<string, string> = {
  "equipe-pequena-mensal": "Equipe (mensal)",
  "equipe-pequena-semestral": "Equipe (semestral)",
  "equipe-pequena-anual": "Equipe (anual)",
  "equipe-media-mensal": "Equipe Plus (mensal)",
  "equipe-media-semestral": "Equipe Plus (semestral)",
  "equipe-media-anual": "Equipe Plus (anual)",
  "equipe-grande-mensal": "Rede (mensal)",
  "equipe-grande-semestral": "Rede (semestral)",
  "equipe-grande-anual": "Rede (anual)",
};

const MESES_POR_CICLO: Record<string, number> = {
  mensal: 1,
  semestral: 6,
  anual: 12,
};

// "equipe-pequena-semestral" -> 6. Sem sufixo reconhecido (plano antigo,
// de antes do ciclo existir), assume mensal — era o único ciclo então.
function mesesDoCiclo(plano: string): number {
  const sufixo = plano.split("-").pop() ?? "";
  return MESES_POR_CICLO[sufixo] ?? 1;
}

function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

function formatarData(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  // 1) Rola pra frente quem já passou da data estimada.
  const { data: vencidas } = await supabase
    .from("assinaturas_plano")
    .select("id, plano, proxima_cobranca")
    .eq("status", "ativa")
    .lt("proxima_cobranca", hoje);

  for (const assinatura of vencidas ?? []) {
    const novaData = new Date(assinatura.proxima_cobranca + "T00:00:00");
    novaData.setMonth(novaData.getMonth() + mesesDoCiclo(assinatura.plano));
    await supabase
      .from("assinaturas_plano")
      .update({ proxima_cobranca: novaData.toISOString().slice(0, 10), lembrete_enviado_em: null })
      .eq("id", assinatura.id);
  }

  // 2) Manda aviso pra quem está perto da data e ainda não foi avisado.
  const limite = new Date();
  limite.setDate(limite.getDate() + DIAS_DE_ANTECEDENCIA);
  const limiteIso = limite.toISOString().slice(0, 10);

  const { data: proximas } = await supabase
    .from("assinaturas_plano")
    .select("id, plano, valor, proxima_cobranca, profile_id, profiles:profile_id(nome, email)")
    .eq("status", "ativa")
    .is("lembrete_enviado_em", null)
    .gte("proxima_cobranca", hoje)
    .lte("proxima_cobranca", limiteIso);

  if (!resendConfigurado()) {
    return NextResponse.json({
      ok: true,
      aviso: "RESEND_API_KEY ausente — lembretes não enviados, só a rolagem de datas rodou.",
      roladas: vencidas?.length ?? 0,
      pendentes: proximas?.length ?? 0,
    });
  }

  const resend = getResend()!;
  const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  let enviados = 0;
  let falhas = 0;

  for (const assinatura of proximas ?? []) {
    const perfil = assinatura.profiles as unknown as { nome: string; email: string | null } | null;
    if (!perfil?.email) continue;

    const planoLabel = PLANO_LABEL[assinatura.plano] ?? `Plano ${assinatura.plano}`;
    const meses = mesesDoCiclo(assinatura.plano);
    const valorCobrado = assinatura.valor * meses;
    const descricaoValor =
      meses === 1
        ? `${formatoMoeda.format(valorCobrado)}/mês`
        : `${formatoMoeda.format(valorCobrado)} (equivalente a ${formatoMoeda.format(assinatura.valor)}/mês)`;

    try {
      const { error } = await resend.emails.send({
        from: EMAIL_REMETENTE,
        to: perfil.email,
        subject: `Sua assinatura ${planoLabel} renova em ${formatarData(assinatura.proxima_cobranca)}`,
        html: `
          <p>Olá, ${perfil.nome}.</p>
          <p>Sua assinatura do <strong>${planoLabel}</strong> (${descricaoValor})
          vai renovar automaticamente em <strong>${formatarData(assinatura.proxima_cobranca)}</strong>,
          cobrada no mesmo cartão via Mercado Pago.</p>
          <p>Não precisa fazer nada se quiser continuar. Se quiser cancelar antes da cobrança,
          fale com o suporte da Rede Impulso.</p>
          ${rodapeTransacionalHtml()}
        `,
      });

      if (error) {
        falhas += 1;
        continue;
      }

      await supabase
        .from("assinaturas_plano")
        .update({ lembrete_enviado_em: new Date().toISOString() })
        .eq("id", assinatura.id);
      enviados += 1;
    } catch {
      falhas += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    roladas: vencidas?.length ?? 0,
    avisos_enviados: enviados,
    avisos_com_falha: falhas,
  });
}
