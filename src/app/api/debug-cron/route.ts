import { NextResponse } from "next/server";

// Endpoint temporário de diagnóstico — não expõe o valor do segredo,
// só se ele existe e o tamanho. Remover depois de usar.
export async function GET() {
  const segredo = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({
    cronSecretDefinido: Boolean(segredo),
    cronSecretTamanho: segredo?.length ?? 0,
    serviceKeyDefinida: Boolean(serviceKey),
    serviceKeyTamanho: serviceKey?.length ?? 0,
  });
}
