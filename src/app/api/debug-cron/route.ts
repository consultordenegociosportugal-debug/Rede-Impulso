import { NextResponse } from "next/server";

// Endpoint temporário de diagnóstico — lista só os NOMES das variáveis
// de ambiente visíveis nesta função (nunca os valores), filtrado pra
// achar erro de digitação ou confirmar ausência total de CRON_SECRET.
// Remover depois de usar.
export async function GET() {
  const todasAsChaves = Object.keys(process.env).sort();
  const relevantes = todasAsChaves.filter((chave) =>
    /CRON|SECRET|SUPABASE|VERCEL_ENV|VERCEL_PROJECT|VERCEL_URL/i.test(chave),
  );

  return NextResponse.json({
    totalDeVariaveis: todasAsChaves.length,
    variaveisRelevantes: relevantes,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelProjectId: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
  });
}
