import type { SupabaseClient } from "@supabase/supabase-js";
import type { Sugestao } from "./comum";

// Agente de GNV (migração 0035): lê o Levantamento de Preços semanal da
// ANP (dados abertos, últimas 4 semanas), pega os postos que vendem GNV e:
//   - para os que já estão no mapa de apoio: atualiza preço direto (dado
//     oficial, não conteúdo novo — não precisa de aprovação);
//   - para os novos: geocodifica o endereço (OpenStreetMap/Nominatim,
//     gratuito, 1 pedido por segundo) e propõe como ponto de apoio.
// Não usa IA: é importação de dado estruturado.

export const URL_ANP_GNV =
  "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/qus/ultimas-4-semanas-diesel-gnv.csv";

const USER_AGENT = "RedeImpulso/1.0 (https://rede-impulso.vercel.app)";

type PostoAnp = {
  cnpj: string;
  revenda: string;
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  bandeira: string;
  preco: number;
  unidade: string;
  data: string; // yyyy-mm-dd
};

export type ResultadoGnv = { novos: Sugestao[]; precosAtualizados: number; semLocalizacao: number };

function titulo(texto: string) {
  const minusculas = new Set(["de", "da", "do", "das", "dos", "e"]);
  return texto
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

// "METROPOLITANO COMERCIO DE COMBUSTIVEIS LTDA" → "Posto Metropolitano"
export function nomeFantasia(revenda: string, bandeira: string) {
  const limpo = revenda
    .replace(/\b(LTDA|EIRELI|ME|EPP|S\/?A|S\.A\.?)\b\.?/gi, " ")
    .replace(/&?\s*\bCIA\b\.?/gi, " ")
    .replace(
      /\b(COMERCIO|COM\.?|DERIVADOS|PETROLEO|COMBUSTIVEIS|COMBUSTIVEL|LUBRIFICANTES|AUTO POSTO|POSTO|SERVICOS|ENERGETICOS)\b\.?/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    // Sobras de "X COMERCIO DE Y E SERVICOS": conectores soltos nas pontas.
    .replace(/^(\s*(-|&|,|\.|\bE\b|\bDE\b|\bDO\b|\bDA\b))+/gi, "")
    .replace(/((-|&|,|\.|\bE\b|\bDE\b|\bDO\b|\bDA\b)\s*)+$/gi, "")
    .trim();
  const base = limpo ? `Posto ${titulo(limpo)}` : titulo(revenda);
  return bandeira && bandeira !== "BRANCA" ? `${base} (${titulo(bandeira)})` : base;
}

export async function baixarPostosGnv(): Promise<PostoAnp[]> {
  const resposta = await fetch(URL_ANP_GNV, { headers: { "User-Agent": USER_AGENT } });
  if (!resposta.ok) throw new Error(`ANP respondeu ${resposta.status}`);
  const linhas = (await resposta.text()).replace(/^\uFEFF/, "").split(/\r?\n/);
  const cab = linhas[0].split(";").map((c) => c.trim());
  const col = (nome: string) => {
    const i = cab.indexOf(nome);
    if (i < 0) throw new Error(`Coluna "${nome}" não encontrada no CSV da ANP — o formato mudou.`);
    return i;
  };
  const c = {
    uf: col("Estado - Sigla"),
    cidade: col("Municipio"),
    revenda: col("Revenda"),
    cnpj: col("CNPJ da Revenda"),
    rua: col("Nome da Rua"),
    numero: col("Numero Rua"),
    bairro: col("Bairro"),
    cep: col("Cep"),
    produto: col("Produto"),
    data: col("Data da Coleta"),
    valor: col("Valor de Venda"),
    unidade: col("Unidade de Medida"),
    bandeira: col("Bandeira"),
  };

  // Um registro por posto: o da coleta mais recente.
  const porCnpj = new Map<string, PostoAnp>();
  for (const linha of linhas.slice(1)) {
    const f = linha.split(";");
    if (f.length < cab.length || f[c.produto]?.trim().toUpperCase() !== "GNV") continue;
    const [dia, mes, ano] = f[c.data].trim().split("/");
    const posto: PostoAnp = {
      cnpj: f[c.cnpj].replace(/\D/g, ""),
      revenda: f[c.revenda].trim(),
      rua: f[c.rua].trim(),
      numero: f[c.numero].trim(),
      bairro: f[c.bairro].trim(),
      cep: f[c.cep].trim(),
      cidade: f[c.cidade].trim(),
      uf: f[c.uf].trim(),
      bandeira: f[c.bandeira].trim(),
      preco: Number(f[c.valor].replace(",", ".")),
      unidade: "m³",
      data: `${ano}-${mes}-${dia}`,
    };
    if (!posto.cnpj || !Number.isFinite(posto.preco)) continue;
    const atual = porCnpj.get(posto.cnpj);
    if (!atual || posto.data > atual.data) porCnpj.set(posto.cnpj, posto);
  }
  return [...porCnpj.values()];
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Tenta rua+número, depois rua sem número, depois só o CEP (aproximado).
async function geocodificar(p: PostoAnp): Promise<{ lat: number; lng: number; aproximada: boolean } | null> {
  const rua = p.rua.replace(/\s+-\s+LADO\s+\w+/i, "").replace(/,?\s*KM.*$/i, "").trim();
  const numero = /^\d+/.test(p.numero) ? p.numero.match(/^\d+/)![0] : "";
  const tentativas: [Record<string, string>, boolean][] = [
    ...(numero ? [[{ street: `${numero} ${rua}`, city: p.cidade, state: p.uf }, false] as [Record<string, string>, boolean]] : []),
    [{ street: rua, city: p.cidade, state: p.uf }, false],
    ...(p.cep ? [[{ postalcode: p.cep }, true] as [Record<string, string>, boolean]] : []),
  ];

  for (const [consulta, aproximada] of tentativas) {
    const params = new URLSearchParams({ ...consulta, country: "Brasil", countrycodes: "br", format: "json", limit: "1" });
    const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    await esperar(1100); // política de uso do Nominatim: 1 pedido por segundo
    if (!resposta.ok) continue;
    const [achado] = (await resposta.json()) as { lat: string; lon: string }[];
    if (achado) return { lat: Number(achado.lat), lng: Number(achado.lon), aproximada };
  }
  return null;
}

export async function executarGnv(
  supabase: SupabaseClient,
  opcoes: { limiteNovos?: number } = {},
): Promise<ResultadoGnv> {
  // Vercel dá até 300s por execução; ~3s por posto novo no pior caso.
  const limiteNovos = opcoes.limiteNovos ?? 60;
  const postos = await baixarPostosGnv();

  const [{ data: existentes, error: e1 }, { data: jaSugeridos, error: e2 }] = await Promise.all([
    supabase.from("pontos_apoio").select("id, fonte_externa_id, preco_atualizado_em").like("fonte_externa_id", "anp:%"),
    supabase
      .from("ev_agente_sugestoes")
      .select("payload->>fonte_externa_id")
      .eq("acao", "criar_ponto_apoio")
      .neq("status", "erro"),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const noMapa = new Map((existentes ?? []).map((p) => [p.fonte_externa_id as string, p]));
  // Pendentes, aprovados e rejeitados: não repropõe (rejeitado continua rejeitado).
  const sugeridos = new Set(
    ((jaSugeridos ?? []) as Record<string, string>[]).map((s) => s.fonte_externa_id).filter(Boolean),
  );

  let precosAtualizados = 0;
  let semLocalizacao = 0;
  const novos: Sugestao[] = [];

  for (const p of postos) {
    const id = `anp:${p.cnpj}`;
    const atual = noMapa.get(id);

    if (atual) {
      if (!atual.preco_atualizado_em || p.data > atual.preco_atualizado_em) {
        const { error } = await supabase
          .from("pontos_apoio")
          .update({ preco: p.preco, preco_unidade: p.unidade, preco_atualizado_em: p.data })
          .eq("id", atual.id);
        if (!error) precosAtualizados++;
      }
      continue;
    }

    if (sugeridos.has(id) || novos.length >= limiteNovos) continue;

    const local = await geocodificar(p);
    if (!local) {
      semLocalizacao++;
      continue;
    }

    const nome = nomeFantasia(p.revenda, p.bandeira);
    const cidade = titulo(p.cidade);
    const endereco = `${titulo(p.rua)}${p.numero ? `, ${p.numero}` : ""}${p.bairro ? ` - ${titulo(p.bairro)}` : ""}`;
    const dataBr = p.data.split("-").reverse().join("/");

    novos.push({
      acao: "criar_ponto_apoio",
      payload: {
        tipo: "gnv",
        nome,
        endereco,
        cidade,
        estado: p.uf,
        latitude: local.lat,
        longitude: local.lng,
        localizacao_aproximada: local.aproximada,
        preco: p.preco,
        preco_unidade: p.unidade,
        preco_atualizado_em: p.data,
        bandeira: p.bandeira ? titulo(p.bandeira) : null,
        observacoes: `Razão social: ${p.revenda}. Preço do GNV coletado pela ANP em ${dataBr}.`,
        fonte_externa_id: id,
      },
      resumo: `Posto de GNV: ${nome} — ${cidade}/${p.uf} (R$ ${p.preco.toFixed(2).replace(".", ",")}/m³)`,
      justificativa:
        `Posto listado no Levantamento de Preços da ANP (coleta de ${dataBr}).` +
        (local.aproximada ? " Endereço não localizado com precisão — posição aproximada pelo CEP." : ""),
      fontes: [URL_ANP_GNV],
    });
  }

  return { novos, precosAtualizados, semLocalizacao };
}
