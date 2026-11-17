// Data de "hoje" no fuso de Brasília, formato yyyy-mm-dd — usada como
// valor padrão e `min` dos seletores de data de agendamento.
//
// `new Date().toISOString()` sempre devolve a data em UTC. Brasília é
// UTC-3, então das 21h às 23h59 (horário de Brasília) o UTC já virou o
// dia seguinte — nesse intervalo, todo dia, o antigo `hojeISO()` local
// de cada formulário devolvia a data de AMANHÃ como se fosse hoje. Isso
// travava o seletor de data (min = amanhã) e escondia a opção de marcar
// uma visita pra ainda hoje, bem na janela em que mais gente agenda pro
// fim do dia.
export function hojeISO(): string {
  return diaBrasilia(new Date());
}

// Mesma lógica de hojeISO(), mas pra uma data qualquer — usada pra
// comparar "essa visita é hoje?" sem cair no mesmo bug de fuso
// (`.toDateString()` compara no fuso do PROCESSO, UTC na Vercel).
export function diaBrasilia(data: Date | string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(data));
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
}

// Soma (ou subtrai, com n negativo) dias a uma data yyyy-mm-dd — opera só
// no calendário, nunca num instante real, então o estouro de mês/ano que
// o Date.UTC normaliza sozinho não introduz nenhuma ambiguidade de fuso.
export function somarDias(dataISO: string, n: number): string {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

// Diferença em dias de calendário entre duas datas yyyy-mm-dd (sempre UTC
// meia-noite nos dois lados — nunca cai em fração de dia por causa de
// fuso). Usada pra só oferecer "visita por vídeo" quando a visita está a
// mais de 1 dia de distância.
export function diasEntre(dataA: string, dataB: string): number {
  return Math.round((new Date(dataB).getTime() - new Date(dataA).getTime()) / 86_400_000);
}
