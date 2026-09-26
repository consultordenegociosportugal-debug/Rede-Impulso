import type { SupabaseClient } from "@supabase/supabase-js";
import {
  alvosPendentes,
  doDia,
  estruturar,
  listaDeTexto,
  normalizar,
  numeroOuNulo,
  objeto,
  pesquisar,
  texto,
  textoOuNulo,
  type Sugestao,
} from "./comum";

// Agente do mapa de eletropostos: a cada dia cobre 2 estados — procura
// pontos públicos que ainda não estão no diretório e confere se os que
// já estão continuam funcionando.

const ESTADOS = [
  "SP", "RJ", "MG", "PR", "SC", "RS", "DF", "GO", "BA", "PE", "CE", "ES", "MT", "MS",
  "PA", "AM", "RN", "PB", "AL", "SE", "PI", "MA", "TO", "RO", "AC", "AP", "RR",
];

const CONECTORES = ["tipo2", "ccs2", "chademo", "tesla", "j1772"];

type Resultado = {
  novos: {
    nome: string;
    endereco: string;
    cidade: string;
    estado: string;
    conectores: string[];
    potencia_kw: number | null;
    preco_kwh: number | null;
    operadora: string | null;
    observacoes: string | null;
    justificativa: string;
    fontes: string[];
  }[];
  atualizacoes: {
    id: string;
    status: "ativo" | "inativo" | "em_manutencao";
    observacoes: string | null;
    justificativa: string;
    fontes: string[];
  }[];
};

const SCHEMA = objeto({
  novos: {
    type: "array",
    items: objeto({
      nome: texto,
      endereco: texto,
      cidade: texto,
      estado: { type: "string", description: "Sigla da UF, ex: SP" },
      conectores: { type: "array", items: { type: "string", enum: CONECTORES } },
      potencia_kw: numeroOuNulo,
      preco_kwh: numeroOuNulo,
      operadora: textoOuNulo,
      observacoes: textoOuNulo,
      justificativa: texto,
      fontes: listaDeTexto,
    }),
  },
  atualizacoes: {
    type: "array",
    items: objeto({
      id: texto,
      status: { type: "string", enum: ["ativo", "inativo", "em_manutencao"] },
      observacoes: textoOuNulo,
      justificativa: texto,
      fontes: listaDeTexto,
    }),
  },
});

export async function executarEletropostos(supabase: SupabaseClient): Promise<Sugestao[]> {
  const estados = doDia(ESTADOS, 2);

  const { data: existentes } = await supabase
    .from("ev_eletropostos")
    .select("id, nome, endereco, cidade, estado, status, verificado_em")
    .in("estado", estados)
    .order("verificado_em", { ascending: true, nullsFirst: true });

  const lista = existentes ?? [];
  const pendentes = await alvosPendentes(supabase, "atualizar_eletroposto");
  const aConferir = lista.filter((e) => !pendentes.has(e.id)).slice(0, 15);

  const pesquisa = await pesquisar(
    `Você mantém o diretório de eletropostos (pontos de recarga públicos) da plataforma. Fontes
boas: sites e apps das operadoras (Tupinambá, Zletric, EZVolt, Shell Recharge, Raízen, WEG, Ipiranga,
EDP, Neoenergia, Enel X, Volvo, BYD), PlugShare, Electromaps, notícias locais e a ABVE.`,
    `Estados desta rodada: ${estados.join(", ")}.

1) Encontre até 10 eletropostos públicos nesses estados que NÃO estejam nesta lista do diretório:
${lista.map((e) => `- ${e.nome} — ${e.cidade}/${e.estado}`).join("\n") || "(diretório vazio nesses estados)"}
Para cada um: nome, endereço completo, cidade, UF, conectores, potência (kW), preço por kWh se
publicado, operadora e a URL da fonte.

2) Verifique se estes pontos já cadastrados continuam funcionando, fecharam ou estão em manutenção:
${aConferir.map((e) => `- id ${e.id}: ${e.nome}, ${e.endereco}, ${e.cidade}/${e.estado} (hoje: ${e.status})`).join("\n") || "(nenhum)"}
Só aponte mudança de status com evidência clara e recente.`,
  );

  const resultado = await estruturar<Resultado>(
    "Em `atualizacoes`, inclua só pontos cujo status real difere do atual, usando o id exato informado.",
    pesquisa,
    SCHEMA,
  );

  const jaTemos = new Set(lista.map((e) => `${normalizar(e.nome)}|${normalizar(e.cidade)}`));
  const idsConferidos = new Map(aConferir.map((e) => [e.id, e]));
  const sugestoes: Sugestao[] = [];

  for (const n of resultado.novos) {
    const chave = `${normalizar(n.nome)}|${normalizar(n.cidade)}`;
    if (jaTemos.has(chave) || n.fontes.length === 0) continue;
    jaTemos.add(chave);

    const { justificativa, fontes, ...payload } = n;
    sugestoes.push({
      acao: "criar_eletroposto",
      payload,
      resumo: `Novo eletroposto: ${n.nome} — ${n.cidade}/${n.estado}`,
      justificativa,
      fontes,
    });
  }

  for (const a of resultado.atualizacoes) {
    const atual = idsConferidos.get(a.id);
    if (!atual || atual.status === a.status || a.fontes.length === 0) continue;

    sugestoes.push({
      acao: "atualizar_eletroposto",
      alvo_id: a.id,
      payload: { status: a.status, observacoes: a.observacoes },
      resumo: `${atual.nome} (${atual.cidade}/${atual.estado}): ${atual.status} → ${a.status}`,
      justificativa: a.justificativa,
      fontes: a.fontes,
    });
  }

  return sugestoes;
}
