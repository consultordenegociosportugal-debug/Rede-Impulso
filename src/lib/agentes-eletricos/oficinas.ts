import type { SupabaseClient } from "@supabase/supabase-js";
import {
  doDia,
  estruturar,
  listaDeTexto,
  normalizar,
  objeto,
  pesquisar,
  texto,
  textoOuNulo,
  type Sugestao,
} from "./comum";

// Agente de prospecção de oficinas: a cada dia cobre 2 cidades, acha
// oficinas especializadas em elétricos/híbridos que ainda não estão no
// diretório e rascunha a mensagem de convite para parceria. A mensagem
// NÃO é enviada por aqui — fica na sugestão para o admin mandar.

const CIDADES = [
  "São Paulo/SP", "Rio de Janeiro/RJ", "Belo Horizonte/MG", "Curitiba/PR", "Porto Alegre/RS",
  "Brasília/DF", "Florianópolis/SC", "Campinas/SP", "Goiânia/GO", "Salvador/BA", "Recife/PE",
  "Fortaleza/CE", "Vitória/ES", "Ribeirão Preto/SP", "Joinville/SC", "Londrina/PR",
  "Uberlândia/MG", "Campo Grande/MS", "Cuiabá/MT", "Natal/RN", "Manaus/AM", "Belém/PA",
  "Sorocaba/SP", "São José dos Campos/SP", "Caxias do Sul/RS", "Maringá/PR",
];

type Resultado = {
  oficinas: {
    nome: string;
    especialidades: string[];
    atende_marcas: string[];
    cidade: string;
    estado: string;
    endereco: string | null;
    telefone: string | null;
    descricao: string | null;
    mensagem_contato: string;
    justificativa: string;
    fontes: string[];
  }[];
};

const SCHEMA = objeto({
  oficinas: {
    type: "array",
    items: objeto({
      nome: texto,
      especialidades: listaDeTexto,
      atende_marcas: listaDeTexto,
      cidade: texto,
      estado: { type: "string", description: "Sigla da UF, ex: SP" },
      endereco: textoOuNulo,
      telefone: textoOuNulo,
      descricao: textoOuNulo,
      mensagem_contato: {
        type: "string",
        description: "Mensagem curta de WhatsApp convidando a oficina para o diretório da Rede Impulso Elétricos.",
      },
      justificativa: texto,
      fontes: listaDeTexto,
    }),
  },
});

export async function executarOficinas(supabase: SupabaseClient): Promise<Sugestao[]> {
  const cidades = doDia(CIDADES, 2);
  const nomesCidades = cidades.map((c) => c.split("/")[0]);

  const { data: existentes } = await supabase
    .from("ev_oficinas")
    .select("nome, cidade")
    .in("cidade", nomesCidades);

  const lista = existentes ?? [];

  const pesquisa = await pesquisar(
    `Você prospecta oficinas e assistências técnicas especializadas em veículos elétricos e
híbridos (bateria de alta tensão, motor elétrico, eletrônica embarcada, recarga) para o diretório da
plataforma. Priorize oficinas independentes e multimarcas com evidência pública de trabalho com
elétricos (site, Google Maps, redes sociais, matérias). Concessionárias só se forem referência local.`,
    `Cidades desta rodada: ${cidades.join(", ")}.

Encontre até 5 oficinas por cidade que ainda NÃO estão no diretório:
${lista.map((o) => `- ${o.nome} — ${o.cidade}`).join("\n") || "(nenhuma cadastrada nessas cidades)"}

Para cada uma: nome, especialidades, marcas que atende, cidade, UF, endereço, telefone/WhatsApp
público, uma descrição curta e a URL da fonte. Escreva também uma mensagem curta e cordial de
WhatsApp convidando a oficina a entrar (de graça) no diretório da Rede Impulso Elétricos, citando
algo específico dela.`,
  );

  const resultado = await estruturar<Resultado>("", pesquisa, SCHEMA);

  const jaTemos = new Set(lista.map((o) => `${normalizar(o.nome)}|${normalizar(o.cidade)}`));
  const sugestoes: Sugestao[] = [];

  for (const o of resultado.oficinas) {
    const chave = `${normalizar(o.nome)}|${normalizar(o.cidade)}`;
    if (jaTemos.has(chave) || o.fontes.length === 0) continue;
    jaTemos.add(chave);

    const { justificativa, fontes, ...payload } = o;
    sugestoes.push({
      acao: "criar_oficina",
      payload,
      resumo: `Nova oficina: ${o.nome} — ${o.cidade}/${o.estado}`,
      justificativa,
      fontes,
    });
  }

  return sugestoes;
}
