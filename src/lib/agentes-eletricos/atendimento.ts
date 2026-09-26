import type { SupabaseClient } from "@supabase/supabase-js";
import { alvosPendentes, estruturar, listaDeTexto, objeto, pesquisar, texto, type Sugestao } from "./comum";

// Agente de atendimento da comunidade: pega posts dos últimos 30 dias
// que ainda não têm nenhum comentário e rascunha uma resposta útil,
// com fonte. A resposta aparece no post como "Assistente Rede Impulso".

type PostSemResposta = {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  ev_comentarios: { count: number }[];
};

type Resultado = {
  respostas: { post_id: string; texto: string; justificativa: string; fontes: string[] }[];
};

const SCHEMA = objeto({
  respostas: {
    type: "array",
    items: objeto({
      post_id: texto,
      texto: {
        type: "string",
        description: "A resposta que será publicada como comentário no post, até ~1200 caracteres.",
      },
      justificativa: texto,
      fontes: listaDeTexto,
    }),
  },
});

export async function executarAtendimento(supabase: SupabaseClient): Promise<Sugestao[]> {
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await supabase
    .from("ev_posts")
    .select("id, categoria, titulo, conteudo, ev_comentarios(count)")
    .gte("created_at", desde)
    .order("created_at", { ascending: true });

  const pendentes = await alvosPendentes(supabase, "responder_post");
  const semResposta = ((data ?? []) as PostSemResposta[])
    .filter((p) => (p.ev_comentarios[0]?.count ?? 0) === 0 && !pendentes.has(p.id))
    .slice(0, 5);

  if (semResposta.length === 0) return [];

  const pesquisa = await pesquisar(
    `Você responde a comunidade de donos e interessados em carros elétricos. Responda como um
especialista gentil e direto: resolva a dúvida com fatos atuais do Brasil (preços, autonomia real,
recarga, incentivos, IPVA, garantia de bateria), cite a fonte e, quando depender de caso a caso,
diga isso. Não recomende marcas por preferência pessoal e não dê conselho financeiro.`,
    `Rascunhe uma resposta para cada publicação abaixo:

${semResposta
  .map((p) => `### post_id ${p.id} (${p.categoria})\nTítulo: ${p.titulo}\n${p.conteudo}`)
  .join("\n\n")}`,
  );

  const resultado = await estruturar<Resultado>(
    "Use o post_id exato de cada publicação. `texto` é só a resposta final para o usuário, sem citar o post_id.",
    pesquisa,
    SCHEMA,
  );

  const porId = new Map(semResposta.map((p) => [p.id, p]));

  return resultado.respostas
    .filter((r) => porId.has(r.post_id) && r.texto.trim())
    .map((r) => ({
      acao: "responder_post" as const,
      alvo_id: r.post_id,
      payload: { texto: r.texto.trim() },
      resumo: `Resposta para "${porId.get(r.post_id)!.titulo}"`,
      justificativa: r.justificativa,
      fontes: r.fontes,
    }));
}
