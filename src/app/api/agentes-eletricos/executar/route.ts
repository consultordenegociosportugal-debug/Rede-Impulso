import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarSugestoes, type Sugestao } from "@/lib/agentes-eletricos/comum";
import { executarCuradoria } from "@/lib/agentes-eletricos/curadoria";
import { executarEletropostos } from "@/lib/agentes-eletricos/eletropostos";
import { executarAtendimento } from "@/lib/agentes-eletricos/atendimento";
import { executarOficinas } from "@/lib/agentes-eletricos/oficinas";
import { executarGnv } from "@/lib/agentes-eletricos/gnv";

// Executa um agente do braço de elétricos (migração 0033):
// GET /api/agentes-eletricos/executar?agente=eletropostos
//
// Disparado pelo Vercel Cron (ver vercel.json, um horário por agente)
// com CRON_SECRET, ou pelo botão "Executar agora" em /admin/agentes com
// a sessão de um admin. Em ambos os casos a escrita usa a service role.

// Pesquisa na web + estruturação pode passar de 1 minuto.
export const maxDuration = 300;

// Cada agente devolve as sugestões e, opcionalmente, uma nota extra para o
// resumo da execução (ex.: o de GNV também atualiza preços direto).
type Execucao = { sugestoes: Sugestao[]; nota?: string };

const soSugestoes = (fn: (supabase: SupabaseClient) => Promise<Sugestao[]>) => async (supabase: SupabaseClient) => ({
  sugestoes: await fn(supabase),
});

const AGENTES: Record<string, (supabase: SupabaseClient) => Promise<Execucao>> = {
  curadoria: soSugestoes(executarCuradoria),
  eletropostos: soSugestoes(executarEletropostos),
  atendimento: soSugestoes(executarAtendimento),
  oficinas: soSugestoes(executarOficinas),
  gnv: async (supabase) => {
    const r = await executarGnv(supabase);
    return {
      sugestoes: r.novos,
      nota: `${r.precosAtualizados} preços atualizados${r.semLocalizacao ? `, ${r.semLocalizacao} sem localização` : ""}`,
    };
  },
};

async function autorizado(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") === `Bearer ${segredo}`) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: perfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return Boolean(perfil?.is_admin);
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const agenteId = request.nextUrl.searchParams.get("agente") ?? "";
  const executar = AGENTES[agenteId];
  if (!executar) {
    return NextResponse.json({ erro: "Agente desconhecido." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ erro: "ANTHROPIC_API_KEY ausente." }, { status: 503 });
  }
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json({ erro: "SUPABASE_SERVICE_ROLE_KEY ausente." }, { status: 503 });
  }

  const { data: agente } = await supabase
    .from("ev_agentes")
    .select("modo, ativo")
    .eq("id", agenteId)
    .single();

  if (!agente?.ativo) {
    return NextResponse.json({ ok: true, agente: agenteId, pulado: "agente desativado" });
  }

  let resumo: string;
  let status = 200;
  let corpo: Record<string, unknown>;

  try {
    const { sugestoes, nota } = await executar(supabase);
    const resultado = await registrarSugestoes(supabase, agenteId, agente.modo === "autonomo", sugestoes);
    resumo =
      `${resultado.sugestoes} sugestões` +
      (resultado.aplicadas ? `, ${resultado.aplicadas} aplicadas` : "") +
      (resultado.ignoradas ? `, ${resultado.ignoradas} repetidas` : "") +
      (resultado.erros.length ? `, ${resultado.erros.length} erros` : "") +
      (nota ? ` · ${nota}` : "");
    corpo = { ok: true, agente: agenteId, modo: agente.modo, ...resultado };
  } catch (erro) {
    resumo = `Falhou: ${erro instanceof Error ? erro.message : String(erro)}`;
    status = 502;
    corpo = { erro: resumo };
  }

  await supabase
    .from("ev_agentes")
    .update({ ultima_execucao: new Date().toISOString(), ultimo_resultado: resumo })
    .eq("id", agenteId);

  return NextResponse.json(corpo, { status });
}
