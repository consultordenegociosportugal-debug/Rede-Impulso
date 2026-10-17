import type { SupabaseClient } from "@supabase/supabase-js";

type Opcoes = {
  /** Valor cru do parâmetro `depois`, quando houver. */
  depois?: string | null;
  /**
   * Quando true, um perfil sem telefone é mandado para
   * /completar-cadastro antes de qualquer outra coisa. Usado no
   * retorno do login social, onde o provedor não manda telefone.
   */
  exigirCadastroCompleto?: boolean;
  /** Papel sugerido pela página de origem do login social. */
  papelSugerido?: string | null;
};

/** Só aceita caminho interno — `//host` é URL absoluta disfarçada. */
export function caminhoInternoSeguro(depois?: string | null): string | null {
  if (!depois) return null;
  if (!depois.startsWith("/") || depois.startsWith("//")) return null;
  return depois;
}

const PAPEIS_RECONHECIDOS = ["comprador", "corretor", "gestor"];

/**
 * Contas de antes da limpeza do marketplace podem ter um `role` que não
 * existe mais (ex.: "vendedor"). `/completar-cadastro` usa isso pra saber
 * se já pode liberar o usuário ou se precisa segurá-lo até ele escolher um
 * papel válido — sem essa checagem, um papel desconhecido com telefone já
 * preenchido criava um loop (completar-cadastro ↔ destinoPosLogin).
 */
export function papelReconhecido(role: string | null | undefined): boolean {
  return !!role && PAPEIS_RECONHECIDOS.includes(role);
}

/**
 * Decide para onde o usuário vai depois de autenticar. É a mesma
 * decisão para e-mail/senha (`/entrar`) e para o retorno do OAuth
 * (`/auth/callback`), para os dois caminhos não divergirem.
 */
export async function destinoPosLogin(
  supabase: SupabaseClient,
  userId: string,
  opcoes: Opcoes = {},
): Promise<string> {
  const depois = caminhoInternoSeguro(opcoes.depois);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, telefone, is_admin")
    .eq("id", userId)
    .single();

  if (opcoes.exigirCadastroCompleto && !profile?.telefone?.trim()) {
    const params = new URLSearchParams();
    if (depois) params.set("depois", depois);
    if (opcoes.papelSugerido) params.set("papel", opcoes.papelSugerido);
    const query = params.toString();
    return `/completar-cadastro${query ? `?${query}` : ""}`;
  }

  if (depois) return depois;

  // Admin não tem um "role" próprio — é um privilégio à parte sobre
  // qualquer papel. Sem isso, cai no fallback de role e vê a home como
  // se fosse pedir cadastro de novo.
  if (profile?.is_admin) return "/admin";

  if (profile?.role === "comprador") return "/area-cliente";

  if (profile?.role === "corretor") return "/painel-negocios";

  if (profile?.role === "gestor") return "/painel-gestor";

  // Papel que não existe mais (ex.: "vendedor", de antes da limpeza do
  // marketplace) — manda completar o cadastro pra escolher um papel válido.
  // Importante: nunca retornar "/" aqui — a home também chama essa função
  // pra decidir pra onde mandar quem já está logado, e "/" criaria um loop
  // infinito de redirecionamento pra quem tiver um papel desconhecido.
  return "/completar-cadastro";
}
