import { NextRequest, NextResponse } from "next/server";
import { cidadeDeCoordenadas } from "@/lib/geocodificar";

// Reverse-geocode de lat/lng pra nome de cidade, usado pela aba
// "Próximas" de /buscar-profissionais. Fica no servidor porque o
// fallback pro Nominatim (ver src/lib/geocodificar.ts) exige um
// User-Agent customizado que o navegador não deixa sobrescrever.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latBruto = searchParams.get("lat");
  const lngBruto = searchParams.get("lng");

  // Number(null) vira 0, não NaN — sem checar a presença dos parâmetros
  // antes de converter, uma chamada sem lat/lng nenhum passava disfarçada
  // de "(0, 0)" em vez de cair no erro de coordenadas inválidas.
  if (!latBruto || !lngBruto) {
    return NextResponse.json({ erro: "Coordenadas inválidas." }, { status: 400 });
  }

  const latitude = Number(latBruto);
  const longitude = Number(lngBruto);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ erro: "Coordenadas inválidas." }, { status: 400 });
  }

  const cidade = await cidadeDeCoordenadas(latitude, longitude);
  return NextResponse.json({ cidade });
}
