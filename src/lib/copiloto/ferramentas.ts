import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularRaioX, PREMISSAS_PADRAO, simularEletrico } from "@/lib/motorista/raio-x";
import type { ItemRadar } from "@/lib/motorista/radar";

// Ferramentas do Copiloto do motorista: cada uma consulta dados REAIS da
// plataforma com a sessão do próprio usuário (RLS vale — o copiloto só
// enxerga o Raio-X de quem está conversando). Além delas o copiloto tem a
// busca na web (ferramenta de servidor), declarada na rota.

export type LinkCopiloto = { href: string; titulo: string; detalhe: string };
export type ResultadoFerramenta = { dados: unknown; links?: LinkCopiloto[] };

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FERRAMENTAS: Anthropic.Beta.BetaTool[] = [
  {
    name: "meu_raio_x",
    description:
      "Lê os números que o motorista salvou no Raio-X do lucro real (rotina, carro, custos, faturamento) e devolve o cálculo: lucro real no mês, por hora, por km, custo por km, e a simulação de troca por um elétrico. Use sempre que a pergunta for sobre os ganhos, custos ou o carro DELE.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "radar_do_dia",
    description:
      "Lê o Radar do motorista mais recente: preço médio dos combustíveis (ANP), promoções de recarga, eventos que aumentam a demanda, clima e mudanças nas plataformas (Uber, 99, inDrive). Filtra pela UF, se informada.",
    input_schema: {
      type: "object",
      properties: { uf: { type: "string", description: "Sigla da UF, ex: SP. Opcional." } },
    },
  },
  {
    name: "buscar_eletropostos",
    description: "Busca eletropostos no diretório da Rede Impulso por cidade/UF e conector.",
    input_schema: {
      type: "object",
      properties: {
        cidade: { type: "string" },
        uf: { type: "string", description: "Sigla da UF, ex: SP." },
        conector: { type: "string", enum: ["tipo2", "ccs2", "chademo", "tesla", "j1772"] },
      },
    },
  },
  {
    name: "buscar_oficinas",
    description: "Busca oficinas especializadas em elétricos/híbridos no diretório da Rede Impulso.",
    input_schema: {
      type: "object",
      properties: {
        cidade: { type: "string" },
        uf: { type: "string", description: "Sigla da UF, ex: SP." },
        marca: { type: "string", description: "Marca do carro, ex: BYD." },
      },
    },
  },
  {
    name: "buscar_pontos_apoio",
    description:
      "Busca pontos de apoio para motoristas indicados e avaliados pela comunidade: GNV, banheiro, descanso, alimentação, lavagem, borracharia. Para recarga de elétrico use buscar_eletropostos.",
    input_schema: {
      type: "object",
      properties: {
        tipo: {
          type: "string",
          enum: ["gnv", "banheiro", "descanso", "alimentacao", "lavagem", "borracharia", "outro"],
        },
        cidade: { type: "string" },
        uf: { type: "string", description: "Sigla da UF, ex: SP." },
      },
    },
  },
  {
    name: "buscar_eletricos_a_venda",
    description: "Busca carros elétricos e híbridos anunciados no marketplace da Rede Impulso.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["eletrico", "hibrido", "hibrido_plugin"] },
        preco_max: { type: "number", description: "Preço máximo em reais." },
        uf: { type: "string", description: "Sigla da UF, ex: SP." },
      },
    },
  },
];

type Entrada = Record<string, string | number | undefined>;

function texto(v: unknown) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function executarFerramenta(
  supabase: SupabaseClient,
  userId: string,
  nome: string,
  entrada: Entrada,
): Promise<ResultadoFerramenta> {
  switch (nome) {
    case "meu_raio_x":
      return meuRaioX(supabase, userId);
    case "radar_do_dia":
      return radarDoDia(supabase, texto(entrada.uf));
    case "buscar_eletropostos":
      return buscarEletropostos(supabase, entrada);
    case "buscar_oficinas":
      return buscarOficinas(supabase, entrada);
    case "buscar_pontos_apoio":
      return buscarPontosApoio(supabase, entrada);
    case "buscar_eletricos_a_venda":
      return buscarEletricos(supabase, entrada);
    default:
      return { dados: { erro: `Ferramenta desconhecida: ${nome}` } };
  }
}

async function meuRaioX(supabase: SupabaseClient, userId: string): Promise<ResultadoFerramenta> {
  const { data: p, error } = await supabase.from("motorista_perfis").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);

  if (!p || !p.faturamento_mensal) {
    return {
      dados: { preenchido: false, orientacao: "O motorista ainda não salvou o Raio-X. Sugira preencher em /motorista/raio-x." },
      links: [{ href: "/motorista/raio-x", titulo: "Fazer meu Raio-X", detalhe: "Leva 2 minutos" }],
    };
  }

  const entrada = {
    kmPorDia: Number(p.km_por_dia ?? 0),
    horasPorDia: Number(p.horas_por_dia ?? 0),
    diasPorMes: Number(p.dias_por_mes ?? 0),
    faturamentoMensal: Number(p.faturamento_mensal),
    combustivel: p.combustivel ?? "flex",
    consumo: Number(p.consumo ?? 0),
    precoEnergia: Number(p.preco_energia ?? 0),
    valorVeiculo: p.valor_veiculo === null ? null : Number(p.valor_veiculo),
    parcelaOuAluguel: Number(p.parcela_ou_aluguel ?? 0),
    seguro: Number(p.seguro ?? 0),
    manutencao: p.manutencao === null ? null : Number(p.manutencao),
    outrosCustos: Number(p.outros_custos ?? 0),
  };
  const r = calcularRaioX(entrada);
  const sim = entrada.combustivel === "eletrico" ? null : simularEletrico(entrada, PREMISSAS_PADRAO);

  return {
    dados: {
      preenchido: true,
      atualizado_em: p.updated_at,
      cidade: p.cidade,
      uf: p.estado,
      carro: p.veiculo,
      combustivel: p.combustivel,
      km_mes: r.kmMes,
      horas_mes: r.horasMes,
      faturamento: moeda(entrada.faturamentoMensal),
      custos: r.custos.map((c) => `${c.rotulo}: ${moeda(c.valor)}${c.estimado ? " (estimado)" : ""}`),
      custo_total: moeda(r.custoTotal),
      lucro_real: moeda(r.lucro),
      margem: `${Math.round(r.margem * 100)}%`,
      lucro_por_hora: moeda(r.lucroPorHora),
      lucro_por_km: moeda(r.lucroPorKm),
      custo_por_km: moeda(r.custoPorKm),
      premissas: r.premissas,
      simulacao_eletrico: sim && {
        diferenca_mensal: moeda(sim.diferencaMensal),
        energia_no_eletrico: moeda(sim.custoEnergia),
        premissas: sim.premissas,
      },
    },
    links: [{ href: "/motorista/raio-x", titulo: "Abrir meu Raio-X", detalhe: `Lucro real: ${moeda(r.lucro)}/mês` }],
  };
}

async function radarDoDia(supabase: SupabaseClient, uf: string | null): Promise<ResultadoFerramenta> {
  const { data, error } = await supabase
    .from("motorista_radar")
    .select("data_referencia, itens, precos_referencia")
    .order("data_referencia", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { dados: { disponivel: false } };

  const itens = (data.itens as ItemRadar[]).filter(
    (i) => !uf || !i.estado || i.estado.toUpperCase() === uf.toUpperCase(),
  );
  return {
    dados: { data: data.data_referencia, precos_referencia: data.precos_referencia, itens },
    links: [{ href: `/motorista${uf ? `?uf=${uf.toUpperCase()}` : ""}`, titulo: "Radar completo", detalhe: `De ${data.data_referencia}` }],
  };
}

async function buscarEletropostos(supabase: SupabaseClient, e: Entrada): Promise<ResultadoFerramenta> {
  let q = supabase
    .from("ev_eletropostos")
    .select("id, nome, endereco, cidade, estado, conectores, potencia_kw, preco_kwh, operadora, status")
    .neq("status", "inativo")
    .limit(8);
  if (texto(e.cidade)) q = q.ilike("cidade", `%${texto(e.cidade)}%`);
  if (texto(e.uf)) q = q.eq("estado", texto(e.uf)!.toUpperCase());
  if (texto(e.conector)) q = q.contains("conectores", [texto(e.conector)]);

  const { data, error } = await q;
  // Erro de consulta não pode virar "nenhum resultado" para o modelo.
  if (error) throw new Error(error.message);
  const lista = data ?? [];
  return {
    dados: { total: lista.length, eletropostos: lista },
    links: lista.slice(0, 4).map((p) => ({
      href: "/eletricos/eletropostos",
      titulo: p.nome,
      detalhe: `${p.cidade}/${p.estado}${p.potencia_kw ? ` · ${p.potencia_kw} kW` : ""}`,
    })),
  };
}

async function buscarOficinas(supabase: SupabaseClient, e: Entrada): Promise<ResultadoFerramenta> {
  let q = supabase
    .from("ev_oficinas")
    .select("id, nome, especialidades, atende_marcas, cidade, estado, endereco, telefone, descricao")
    .limit(8);
  if (texto(e.cidade)) q = q.ilike("cidade", `%${texto(e.cidade)}%`);
  if (texto(e.uf)) q = q.eq("estado", texto(e.uf)!.toUpperCase());
  if (texto(e.marca)) q = q.contains("atende_marcas", [texto(e.marca)]);

  const { data, error } = await q;
  // Erro de consulta não pode virar "nenhum resultado" para o modelo.
  if (error) throw new Error(error.message);
  const lista = data ?? [];
  return {
    dados: { total: lista.length, oficinas: lista },
    links: lista.slice(0, 4).map((o) => ({
      href: "/eletricos/oficinas",
      titulo: o.nome,
      detalhe: `${o.cidade}/${o.estado}`,
    })),
  };
}

async function buscarPontosApoio(supabase: SupabaseClient, e: Entrada): Promise<ResultadoFerramenta> {
  let q = supabase
    .from("pontos_apoio_resumo")
    .select("id, tipo, nome, endereco, cidade, estado, aberto_24h, gratuito, horario, observacoes, nota_media, total_avaliacoes")
    .eq("ativo", true)
    .order("nota_media", { ascending: false, nullsFirst: false })
    .limit(8);
  if (texto(e.tipo)) q = q.eq("tipo", texto(e.tipo));
  if (texto(e.cidade)) q = q.ilike("cidade", `%${texto(e.cidade)}%`);
  if (texto(e.uf)) q = q.eq("estado", texto(e.uf)!.toUpperCase());

  const { data, error } = await q;
  // Erro de consulta não pode virar "nenhum resultado" para o modelo.
  if (error) throw new Error(error.message);
  const lista = data ?? [];
  return {
    dados: { total: lista.length, pontos: lista },
    links: lista.length
      ? lista.slice(0, 4).map((p) => ({
          href: `/motorista/apoio/${p.id}`,
          titulo: p.nome,
          detalhe: `${p.cidade}/${p.estado}${p.nota_media ? ` · ★ ${p.nota_media}` : ""}`,
        }))
      : [{ href: "/motorista/apoio", titulo: "Abrir o mapa de apoio", detalhe: "Indique um ponto que você conhece" }],
  };
}

async function buscarEletricos(supabase: SupabaseClient, e: Entrada): Promise<ResultadoFerramenta> {
  let q = supabase
    .from("ev_veiculos")
    .select("id, marca, modelo, ano, km, preco, tipo, cidade, estado, curadoria_selo, curadoria_nota")
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(8);
  if (texto(e.tipo)) q = q.eq("tipo", texto(e.tipo));
  if (typeof e.preco_max === "number") q = q.lte("preco", e.preco_max);
  if (texto(e.uf)) q = q.eq("estado", texto(e.uf)!.toUpperCase());

  const { data, error } = await q;
  // Erro de consulta não pode virar "nenhum resultado" para o modelo.
  if (error) throw new Error(error.message);
  const lista = data ?? [];
  return {
    dados: { total: lista.length, veiculos: lista },
    links: lista.slice(0, 4).map((v) => ({
      href: `/eletricos/veiculos/${v.id}`,
      titulo: `${v.marca} ${v.modelo} ${v.ano}`,
      detalhe: `${v.preco ? moeda(Number(v.preco)) : "Preço a combinar"} · ${v.cidade}/${v.estado}`,
    })),
  };
}
