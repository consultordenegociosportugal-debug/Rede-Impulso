import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sugestões vêm dos bairros que outros corretores já cadastraram — sem
// precisar de uma tabela/catálogo novo. Conforme mais gente se cadastra,
// as sugestões ficam mais ricas e os nomes mais consistentes (evita
// "Jóquei" vs "Joquei" vs "Jockey Clube" pro mesmo bairro).
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  const supabase = await createClient();
  const { data } = await supabase.from("corretor_perfis").select("bairros_atuacao");

  const todos = new Set<string>();
  for (const linha of data ?? []) {
    for (const bairro of linha.bairros_atuacao ?? []) {
      todos.add(bairro);
    }
  }

  const sugestoes = [...todos]
    .filter((b) => !q || b.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .slice(0, 8);

  return NextResponse.json({ sugestoes });
}
