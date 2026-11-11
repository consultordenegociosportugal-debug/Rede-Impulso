// Ícone por status de visita — reforça a cor com uma forma (bom pra
// quem tem dificuldade de distinguir cor, ex. daltonismo vermelho-verde,
// e deixa a leitura de uma lista de agendamentos mais rápida: reconhecer
// um símbolo é mais rápido que ler o rótulo inteiro). Nunca é a única
// informação — sempre acompanha o texto do badge, nunca substitui.
export const ICONE_STATUS_VISITA: Record<string, string> = {
  solicitada: "⏳",
  confirmada: "✓",
  cancelada: "✕",
  realizada: "✓",
  nao_compareceu: "⚠",
};
