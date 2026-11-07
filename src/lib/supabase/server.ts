import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Sem isto, o fetch() por baixo do cliente Supabase podia ficar
      // em cache do Next — depois de uma mutação (ex.: reagendar uma
      // visita), router.refresh() re-renderiza mas reaproveita o
      // mesmo resultado em cache, e a tela não mostra o dado novo até
      // um reload manual da página.
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Chamado de um Server Component sem permissão de escrita —
            // ignorável se houver middleware renovando a sessão.
          }
        },
      },
    },
  );
}
