import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { rotaAdormecida } from "@/lib/modulos";

// Renomeado de middleware.ts para proxy.ts no Next.js 16 — mesma função,
// nome de arquivo e de export diferentes. Sem isso, o token de sessão do
// Supabase não é renovado e o usuário é deslogado silenciosamente.
export async function proxy(request: NextRequest) {
  // Módulo imobiliário adormecido (ver src/lib/modulos.ts): páginas vão
  // para o aviso de pausa; APIs (inclusive crons) respondem sem fazer nada.
  const caminho = request.nextUrl.pathname;
  if (rotaAdormecida(caminho)) {
    if (caminho.startsWith("/api/")) {
      return NextResponse.json({ pausado: true, motivo: "Módulo imobiliário adormecido." });
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/pausado";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  let response = NextResponse.next({ request });

  // Sem as chaves do Supabase configuradas em .env.local, deixa a
  // requisição passar direto em vez de derrubar o app inteiro.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Necessário para manter a sessão viva — não remover esta chamada.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
