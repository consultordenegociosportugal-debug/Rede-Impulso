// Conteúdo institucional compartilhado entre a home e /sobre — mesmo
// texto em dois lugares, só um ponto de verdade. Estrutura espelha a
// seção "Sobre" + "Nosso Objetivo" de referência (appbarber.com.br):
// 1-2 parágrafos descrevendo o sistema, "dividido em dois módulos", e
// 3 cards de objetivo.

export const SOBRE_PARAGRAFOS = [
  "A Rede Impulso é o sistema de agendamento direto entre corretor e cliente — o corretor organiza sua própria agenda, e o cliente marca um horário sem precisar trocar mensagem pra combinar dia e hora.",
];

export const SOBRE_MODULOS = [
  {
    titulo: "Módulo do Corretor",
    texto:
      "O corretor configura os horários em que atende, acompanha visitas e clientes no dashboard e no relatório, e pode cadastrar um cliente na hora — mesmo sem o cliente ter conta — e já sair com a visita confirmada.",
  },
  {
    titulo: "Módulo do Cliente",
    texto:
      "Quem procura um corretor busca por nome, cidade ou proximidade, agenda a visita num horário livre e acompanha tudo em \"Meus agendamentos\", sem precisar trocar mensagem pra combinar dia e hora.",
  },
];

export const OBJETIVOS = [
  {
    icone: "⏱️",
    titulo: "Organize sua agenda",
    texto:
      "Configure os horários em que você atende uma vez só — cada visita agendada já nasce confirmada, sem trocar mensagem pra combinar dia e hora.",
  },
  {
    icone: "🔔",
    titulo: "Nunca perca um agendamento",
    texto:
      "Lembrete automático por e-mail antes de cada visita, pro cliente e pra você — ninguém esquece, ninguém fica esperando à toa.",
  },
  {
    icone: "📈",
    titulo: "Feche mais negócios",
    texto:
      "Cliente agenda na hora, no horário que você já deixou livre. Menos ida e volta, menos desistência por demora na resposta.",
  },
];
