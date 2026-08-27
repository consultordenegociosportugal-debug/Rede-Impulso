import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Papéis cujo acesso só abre depois de enviar documento de verificação.
 * Comprador fica de fora de propósito — ver TIPOS_POR_ROLE em
 * `src/lib/verificacao.ts`, que lista [] para ele.
 */
const PRECISA_DOCUMENTOS = ["vendedor", "corretor", "imobiliaria", "cartorio"];

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
    .select("role, telefone")
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

  if (profile && PRECISA_DOCUMENTOS.includes(profile.role)) {
    const { count } = await supabase
      .from("documentos_verificacao")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId);

    if (!count) return "/verificacao";
  }

  if (profile?.role === "comprador") return "/imoveis";

  return "/";
}
