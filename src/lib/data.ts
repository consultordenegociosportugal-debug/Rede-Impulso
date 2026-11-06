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
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return `${pegar("year")}-${pegar("month")}-${pegar("day")}`;
}
