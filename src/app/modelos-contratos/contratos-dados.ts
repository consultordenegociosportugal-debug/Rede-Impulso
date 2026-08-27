/**
 * Modelos de contrato imobiliário — texto-base.
 *
 * Cada parágrafo pode conter marcadores entre colchetes, ex.: [NOME DO
 * VENDEDOR]. O componente de exibição destaca esses marcadores e, quando
 * a página é aberta a partir de um negócio (`?negocio_id=`), substitui os
 * marcadores que já têm dado disponível no banco.
 *
 * ATENÇÃO: rascunho de trabalho, sem revisão jurídica. Ver o aviso âmbar
 * exibido no topo da página (requisito do produto, não decorativo).
 */

export type Clausula = {
  titulo: string;
  paragrafos: string[];
};

export type ModeloContrato = {
  id: "compra-venda" | "locacao" | "intermediacao";
  aba: string;
  titulo: string;
  resumo: string;
  baseLegal: string;
  nota?: string;
  clausulas: Clausula[];
};

const FECHAMENTO_PADRAO: Clausula = {
  titulo: "Encerramento e assinaturas",
  paragrafos: [
    "E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das testemunhas abaixo.",
    "[CIDADE], [DIA] de [MÊS] de [ANO].",
    "____________________________________\n[NOME DA PRIMEIRA PARTE] — CPF/CNPJ [CPF/CNPJ]",
    "____________________________________\n[NOME DA SEGUNDA PARTE] — CPF/CNPJ [CPF/CNPJ]",
    "Testemunha 1: ____________________________  Nome: [NOME] — CPF [CPF]",
    "Testemunha 2: ____________________________  Nome: [NOME] — CPF [CPF]",
  ],
};

export const MODELOS: ModeloContrato[] = [
  // ------------------------------------------------------------------
  {
    id: "compra-venda",
    aba: "Compra e venda",
    titulo: "Instrumento Particular de Compromisso de Compra e Venda de Imóvel",
    resumo:
      "Modelo para a promessa de compra e venda de imóvel urbano, com pagamento à vista ou parcelado, prevendo sinal, prazo para a escritura definitiva e penalidades por descumprimento.",
    baseLegal:
      "Código Civil, arts. 481 a 532 (compra e venda), 417 a 420 (arras) e 1.417 a 1.418 (promessa de compra e venda); Lei 6.015/73 (registros públicos).",
    nota:
      "Este é um compromisso (promessa) de compra e venda. A transferência da propriedade só se opera com o registro da escritura pública no Cartório de Registro de Imóveis competente. Para imóveis de valor superior a 30 salários mínimos, a escritura pública é exigida pelo art. 108 do Código Civil.",
    clausulas: [
      {
        titulo: "Qualificação das partes",
        paragrafos: [
          "PROMITENTE VENDEDOR(A): [NOME DO VENDEDOR], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG], inscrito(a) no CPF sob o nº [CPF DO VENDEDOR], residente e domiciliado(a) na [ENDEREÇO COMPLETO DO VENDEDOR], doravante denominado(a) simplesmente VENDEDOR.",
          "PROMITENTE COMPRADOR(A): [NOME DO COMPRADOR], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG], inscrito(a) no CPF sob o nº [CPF DO COMPRADOR], residente e domiciliado(a) na [ENDEREÇO COMPLETO DO COMPRADOR], doravante denominado(a) simplesmente COMPRADOR.",
          "Sendo qualquer das partes casada, o respectivo cônjuge comparece e assina o presente instrumento para todos os fins de direito, nos termos do art. 1.647, I, do Código Civil, salvo se o regime for o da separação absoluta de bens.",
          "As partes têm entre si justo e contratado o presente Instrumento Particular de Compromisso de Compra e Venda, que se regerá pelas cláusulas seguintes.",
        ],
      },
      {
        titulo: "Cláusula 1ª — Do objeto",
        paragrafos: [
          "O VENDEDOR é legítimo proprietário e possuidor do imóvel [IMÓVEL], situado na [ENDEREÇO COMPLETO DO IMÓVEL], com área privativa de [ÁREA] m², inscrito na matrícula nº [Nº DA MATRÍCULA] do [CARTÓRIO DE REGISTRO DE IMÓVEIS] e cadastrado na Prefeitura Municipal sob a inscrição imobiliária (IPTU) nº [INSCRIÇÃO IPTU].",
          "Pelo presente instrumento, o VENDEDOR promete vender ao COMPRADOR, que promete comprar, o imóvel acima descrito, com todas as suas benfeitorias, acessões e instalações, no estado de conservação em que se encontra e que é do pleno conhecimento do COMPRADOR.",
          "Integram a venda os seguintes bens e equipamentos que guarnecem o imóvel: [RELACIONAR ARMÁRIOS, LUMINÁRIAS E DEMAIS ITENS QUE PERMANECEM NO IMÓVEL, OU INDICAR \"nenhum\"].",
        ],
      },
      {
        titulo: "Cláusula 2ª — Do preço e da forma de pagamento",
        paragrafos: [
          "O preço certo e ajustado para a presente transação é de [VALOR TOTAL] ([VALOR POR EXTENSO]), que o COMPRADOR pagará ao VENDEDOR da seguinte forma:",
          "a) [VALOR DO SINAL] ([VALOR POR EXTENSO]) a título de sinal e princípio de pagamento (arras confirmatórias), pagos neste ato, servindo o presente instrumento de recibo de quitação da parcela;",
          "b) [VALOR DO SALDO] ([VALOR POR EXTENSO]) a serem pagos até [DATA], no ato da assinatura da escritura pública definitiva;",
          "c) [VALOR FINANCIADO] ([VALOR POR EXTENSO]) mediante financiamento imobiliário a ser contratado pelo COMPRADOR junto ao [BANCO/INSTITUIÇÃO FINANCEIRA], cujo repasse será feito diretamente ao VENDEDOR na forma das regras do agente financeiro.",
          "Todos os pagamentos serão realizados por transferência bancária à conta de titularidade do VENDEDOR: banco [BANCO], agência [AGÊNCIA], conta [CONTA], chave PIX [CHAVE PIX]. Comprovantes de transferência valem como recibo.",
          "O atraso no pagamento de qualquer parcela sujeitará o COMPRADOR a multa de [2]% sobre o valor em atraso, juros de mora de [1]% ao mês e correção monetária pelo [ÍNDICE — ex.: IPCA/IBGE], sem prejuízo do disposto na cláusula de rescisão.",
        ],
      },
      {
        titulo: "Cláusula 3ª — Da condição suspensiva do financiamento",
        paragrafos: [
          "Caso parte do preço dependa de financiamento imobiliário, a eficácia deste contrato fica condicionada à aprovação do crédito pela instituição financeira até [DATA LIMITE].",
          "Não aprovado o financiamento no prazo acima, por motivo não imputável ao COMPRADOR, o contrato ficará automaticamente rescindido, devendo o VENDEDOR restituir integralmente e sem qualquer penalidade os valores já pagos, corrigidos monetariamente, no prazo de [10] dias.",
        ],
      },
      {
        titulo: "Cláusula 4ª — Da posse e da entrega das chaves",
        paragrafos: [
          "A posse direta do imóvel será transmitida ao COMPRADOR em [DATA / na data da assinatura da escritura definitiva / após a quitação integral do preço], mediante entrega das chaves e assinatura do respectivo termo de vistoria.",
          "O imóvel será entregue livre e desocupado de pessoas e coisas, em condições de habitabilidade, com as instalações elétricas e hidráulicas em funcionamento.",
          "A partir da imissão na posse, correm por conta do COMPRADOR todas as despesas de consumo (água, luz, gás), taxas condominiais e tributos incidentes sobre o imóvel.",
        ],
      },
      {
        titulo: "Cláusula 5ª — Da escritura definitiva e do registro",
        paragrafos: [
          "A escritura pública de compra e venda será lavrada no [TABELIONATO DE NOTAS] até [DATA], comparecendo as partes e seus respectivos cônjuges, munidos de toda a documentação exigida.",
          "As despesas com a lavratura da escritura, o Imposto sobre a Transmissão de Bens Imóveis (ITBI) e o registro no Cartório de Registro de Imóveis correrão por conta exclusiva do COMPRADOR, salvo ajuste diverso expressamente indicado em [OBSERVAÇÃO].",
          "O VENDEDOR se obriga a entregar, com antecedência mínima de [10] dias da data marcada para a escritura, todas as certidões e documentos exigidos pelo Tabelionato e pelo agente financeiro, na forma do checklist de documentos anexo.",
        ],
      },
      {
        titulo: "Cláusula 6ª — Dos tributos, encargos e débitos anteriores",
        paragrafos: [
          "O VENDEDOR declara que o imóvel se encontra quite quanto ao IPTU, às taxas condominiais e às demais despesas ordinárias até a data da imissão do COMPRADOR na posse, responsabilizando-se por quaisquer débitos de período anterior que venham a ser apurados, ainda que após a lavratura da escritura.",
          "Débitos condominiais são obrigações propter rem e acompanham o imóvel; o COMPRADOR poderá exigir do VENDEDOR o reembolso integral de valores anteriores à posse que lhe venham a ser cobrados, acrescidos de correção e juros.",
        ],
      },
      {
        titulo: "Cláusula 7ª — Das declarações e garantias do vendedor",
        paragrafos: [
          "O VENDEDOR declara, sob as penas da lei, que: (i) é o legítimo proprietário do imóvel; (ii) o bem está livre e desembaraçado de quaisquer ônus reais, hipotecas, alienação fiduciária, penhoras, arrestos, usufruto, servidões ou gravames não declarados; (iii) não responde por ações reais ou pessoais reipersecutórias, execuções fiscais ou trabalhistas capazes de caracterizar fraude contra credores ou fraude à execução; e (iv) não há litígio possessório ou de vizinhança sobre o imóvel.",
          "O VENDEDOR responde pela evicção de direito e pelos vícios redibitórios, nos termos dos arts. 441 a 457 do Código Civil.",
          "A constatação de informação falsa em qualquer das declarações acima autoriza o COMPRADOR a rescindir este contrato com a restituição integral dos valores pagos e a aplicação da penalidade prevista na cláusula de rescisão.",
        ],
      },
      {
        titulo: "Cláusula 8ª — Da rescisão e das penalidades",
        paragrafos: [
          "O inadimplemento de qualquer obrigação essencial autoriza a parte prejudicada a considerar rescindido o contrato, mediante notificação escrita com prazo de [15] dias para purgação da mora.",
          "Havendo arrependimento do COMPRADOR, perderá este, em favor do VENDEDOR, o valor pago a título de sinal. Havendo arrependimento do VENDEDOR, devolverá este o sinal em dobro, tudo nos termos dos arts. 418 e 420 do Código Civil.",
          "Além do previsto acima, a parte que der causa à rescisão pagará multa compensatória de [10]% sobre o valor total do negócio, sem prejuízo da comissão de corretagem já devida e das perdas e danos comprovados.",
          "As partes poderão, de comum acordo e por escrito, distratar o presente instrumento, definindo no distrato a devolução de valores e a ausência de penalidades.",
        ],
      },
      {
        titulo: "Cláusula 9ª — Da intermediação imobiliária",
        paragrafos: [
          "As partes reconhecem que o presente negócio foi intermediado por [CORRETOR/IMOBILIÁRIA], inscrito(a) no CRECI sob o nº [CRECI], a quem é devida a comissão de corretagem de [6]% sobre o valor total da transação, na forma do contrato de intermediação firmado em apartado.",
          "A comissão será paga por [VENDEDOR/COMPRADOR — indicar quem arca] no momento de [assinatura deste instrumento / recebimento do sinal / lavratura da escritura].",
        ],
      },
      {
        titulo: "Cláusula 10ª — Da proteção de dados",
        paragrafos: [
          "As partes autorizam o tratamento dos dados pessoais necessários à execução deste contrato e ao cumprimento de obrigações legais e regulatórias, nos termos da Lei 13.709/2018 (LGPD), comprometendo-se a não utilizá-los para finalidade diversa.",
        ],
      },
      {
        titulo: "Cláusula 11ª — Das disposições gerais",
        paragrafos: [
          "Este contrato obriga as partes, seus herdeiros e sucessores a qualquer título, e constitui título executivo extrajudicial, nos termos do art. 784 do Código de Processo Civil, desde que assinado por duas testemunhas.",
          "Qualquer alteração só será válida se feita por escrito e assinada por ambas as partes. A tolerância quanto ao descumprimento de qualquer cláusula não implica novação nem renúncia de direitos.",
          "As partes poderão registrar este compromisso na matrícula do imóvel, para fins de eficácia perante terceiros e constituição de direito real de aquisição (art. 1.417 do Código Civil), correndo as despesas por conta de [PARTE RESPONSÁVEL].",
        ],
      },
      {
        titulo: "Cláusula 12ª — Do foro",
        paragrafos: [
          "As partes elegem o foro da comarca de [CIDADE DO FORO] para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
        ],
      },
      FECHAMENTO_PADRAO,
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "locacao",
    aba: "Locação residencial",
    titulo: "Contrato de Locação de Imóvel Residencial",
    resumo:
      "Modelo de locação residencial urbana por prazo determinado, com reajuste anual, definição da garantia locatícia e regras de devolução do imóvel.",
    baseLegal:
      "Lei 8.245/91 (Lei do Inquilinato), com destaque para os arts. 4º (multa proporcional), 17 e 18 (aluguel e reajuste), 22 e 23 (obrigações das partes), 37 (garantias), 27 (direito de preferência) e 58, II (foro).",
    nota:
      "Este modelo trata de locação RESIDENCIAL. A locação não residencial (comercial) segue o mesmo diploma legal, mas tem particularidades relevantes que este texto não cobre: direito à renovação compulsória do contrato (ação renovatória, art. 51 da Lei 8.245/91, com requisitos de prazo mínimo de 5 anos e exploração do mesmo ramo por 3 anos), regras próprias de luvas e de fundo de comércio, e cláusulas de faturamento em shopping centers (art. 54). Para locação comercial, adapte o texto com apoio jurídico.",
    clausulas: [
      {
        titulo: "Qualificação das partes",
        paragrafos: [
          "LOCADOR(A): [NOME DO LOCADOR], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG], inscrito(a) no CPF sob o nº [CPF DO LOCADOR], residente e domiciliado(a) na [ENDEREÇO COMPLETO DO LOCADOR].",
          "LOCATÁRIO(A): [NOME DO LOCATÁRIO], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG], inscrito(a) no CPF sob o nº [CPF DO LOCATÁRIO], residente e domiciliado(a) na [ENDEREÇO COMPLETO DO LOCATÁRIO].",
          "ADMINISTRADORA (se houver): [IMOBILIÁRIA], inscrita no CNPJ sob o nº [CNPJ] e no CRECI-PJ sob o nº [CRECI], atuando na administração da locação por conta e ordem do LOCADOR.",
        ],
      },
      {
        titulo: "Cláusula 1ª — Do objeto e da destinação",
        paragrafos: [
          "O LOCADOR dá em locação ao LOCATÁRIO o imóvel [IMÓVEL], situado na [ENDEREÇO COMPLETO DO IMÓVEL], composto de [DESCRIÇÃO — nº de quartos, banheiros, vagas, área].",
          "O imóvel destina-se exclusivamente à finalidade RESIDENCIAL do LOCATÁRIO e de seu núcleo familiar, sendo vedada a alteração da destinação, a cessão, a sublocação ou o empréstimo, total ou parcial, sem prévia e expressa autorização escrita do LOCADOR (art. 13 da Lei 8.245/91).",
          "O LOCATÁRIO declara receber o imóvel em perfeitas condições de uso, conforme o Termo de Vistoria de Entrada que integra este contrato como Anexo I.",
        ],
      },
      {
        titulo: "Cláusula 2ª — Do prazo",
        paragrafos: [
          "A locação é ajustada pelo prazo determinado de [30] meses, com início em [DATA DE INÍCIO] e término em [DATA DE TÉRMINO], independentemente de aviso, notificação ou interpelação.",
          "Findo o prazo e permanecendo o LOCATÁRIO no imóvel sem oposição do LOCADOR por mais de 30 dias, a locação prorroga-se automaticamente por prazo indeterminado, mantidas as demais cláusulas, podendo ser denunciada por qualquer das partes mediante aviso escrito com 30 dias de antecedência (arts. 46 e 47 da Lei 8.245/91).",
        ],
      },
      {
        titulo: "Cláusula 3ª — Do aluguel e do reajuste",
        paragrafos: [
          "O aluguel mensal é de [VALOR DO ALUGUEL] ([VALOR POR EXTENSO]), a ser pago até o dia [5] de cada mês subsequente ao vencido, por transferência bancária ou boleto emitido em favor de [BENEFICIÁRIO].",
          "O valor do aluguel será reajustado anualmente, ou na menor periodicidade permitida em lei, pela variação acumulada do [ÍNDICE — ex.: IGP-M/FGV ou IPCA/IBGE]. Extinto ou vedado o índice eleito, aplicar-se-á o que vier a substituí-lo.",
          "O atraso no pagamento acarretará multa moratória de [2]% sobre o valor devido, juros de mora de [1]% ao mês pro rata die e correção monetária, além de honorários advocatícios em caso de cobrança judicial.",
          "O LOCADOR poderá conceder abatimento ou carência a título de cortesia, sem que isso configure novação ou alteração definitiva do valor contratado.",
        ],
      },
      {
        titulo: "Cláusula 4ª — Dos encargos e despesas",
        paragrafos: [
          "Além do aluguel, correm por conta do LOCATÁRIO: as despesas de consumo de água, energia elétrica, gás, internet e telefone; as despesas ordinárias de condomínio (art. 23, XII, da Lei 8.245/91); o prêmio do seguro contra incêndio, se assim ajustado; e o IPTU e as taxas municipais incidentes sobre o imóvel, quando expressamente atribuídos nesta cláusula.",
          "Correm por conta do LOCADOR as despesas extraordinárias de condomínio (obras de reforma que interessem à estrutura do prédio, pintura de fachadas, instalação de equipamentos de segurança, fundo de reserva e demais hipóteses do art. 22, parágrafo único, da Lei 8.245/91).",
          "O LOCATÁRIO deverá apresentar os comprovantes de quitação dos encargos sempre que solicitado, e obrigatoriamente na entrega das chaves.",
        ],
      },
      {
        titulo: "Cláusula 5ª — Da garantia locatícia",
        paragrafos: [
          "Em garantia das obrigações assumidas, as partes elegem, de forma ÚNICA e exclusiva, a modalidade assinalada abaixo — sendo vedada por lei a exigência de mais de uma espécie de garantia no mesmo contrato de locação (art. 37, parágrafo único, da Lei 8.245/91, cuja violação é contravenção penal nos termos do art. 43, II):",
          "( ) CAUÇÃO em dinheiro, no valor de [VALOR], equivalente a [3] meses de aluguel — limite legal do art. 38, § 2º —, a ser depositada em caderneta de poupança em nome de ambas as partes e devolvida ao final da locação com os rendimentos, deduzidos eventuais débitos;",
          "( ) FIANÇA prestada por [NOME DO FIADOR], [qualificação completa], CPF [CPF DO FIADOR], que assina este contrato como fiador e principal pagador, solidariamente responsável por todas as obrigações do LOCATÁRIO até a efetiva devolução das chaves, com renúncia expressa ao benefício de ordem (arts. 827 e 828 do Código Civil), oferecendo em garantia o imóvel de matrícula nº [Nº DA MATRÍCULA] do [CARTÓRIO], com anuência de seu cônjuge;",
          "( ) SEGURO-FIANÇA locatícia contratado junto à [SEGURADORA], apólice nº [Nº DA APÓLICE], cuja renovação anual é ônus do LOCATÁRIO durante toda a vigência da locação;",
          "( ) TÍTULO DE CAPITALIZAÇÃO caucionado, emitido por [INSTITUIÇÃO], no valor de [VALOR].",
          "A perda, a insuficiência ou a não renovação da garantia obriga o LOCATÁRIO a apresentar nova garantia idônea em até 30 dias, sob pena de despejo (arts. 40 e 59, § 1º, IX, da Lei 8.245/91).",
        ],
      },
      {
        titulo: "Cláusula 6ª — Das obrigações do locador",
        paragrafos: [
          "Entregar o imóvel em estado de servir ao uso a que se destina e garantir, durante a locação, o uso pacífico do bem.",
          "Responder pelos vícios ou defeitos anteriores à locação e pelas reparações estruturais e de natureza urgente que não decorram de mau uso.",
          "Pagar os impostos e taxas que por lei ou por este contrato lhe caibam, bem como as despesas extraordinárias de condomínio.",
          "Fornecer recibo discriminado dos valores recebidos e, quando solicitado, a descrição minuciosa do estado do imóvel.",
        ],
      },
      {
        titulo: "Cláusula 7ª — Das obrigações do locatário",
        paragrafos: [
          "Pagar pontualmente o aluguel e os encargos previstos neste contrato.",
          "Servir-se do imóvel para o uso convencionado, zelando por ele como se seu fosse, e restituí-lo, ao final, no estado em que o recebeu, salvo as deteriorações decorrentes do uso normal.",
          "Realizar por sua conta os reparos de manutenção e conservação decorrentes do uso ordinário, incluindo substituição de lâmpadas, reparos hidráulicos simples, limpeza de caixa de gordura e conservação de pintura interna.",
          "Comunicar imediatamente ao LOCADOR o surgimento de qualquer dano ou defeito cuja reparação lhe incumba, bem como turbações de terceiros.",
          "Não realizar obras ou modificações na estrutura, na fachada ou na disposição interna do imóvel sem prévia autorização escrita do LOCADOR.",
          "Cumprir integralmente a convenção de condomínio e os regulamentos internos, respondendo por multas aplicadas por infrações de sua responsabilidade.",
          "Permitir a vistoria do imóvel pelo LOCADOR ou por seu preposto, mediante combinação prévia, e permitir sua visitação por interessados nos últimos [90] dias de vigência, em caso de venda ou de nova locação.",
        ],
      },
      {
        titulo: "Cláusula 8ª — Das benfeitorias",
        paragrafos: [
          "As benfeitorias úteis ou voluptuárias eventualmente introduzidas pelo LOCATÁRIO, ainda que autorizadas, não serão indenizáveis e ficarão incorporadas ao imóvel, renunciando o LOCATÁRIO ao direito de retenção (art. 35 da Lei 8.245/91 e Súmula 335 do STJ).",
          "As benfeitorias necessárias, quando não realizadas pelo LOCADOR após comunicação escrita, serão indenizáveis mediante comprovação das despesas.",
        ],
      },
      {
        titulo: "Cláusula 9ª — Da devolução do imóvel",
        paragrafos: [
          "Ao término da locação, o LOCATÁRIO devolverá o imóvel completamente desocupado, limpo, pintado e em perfeito estado de conservação, conforme o Termo de Vistoria de Entrada (Anexo I), acompanhado dos comprovantes de quitação de aluguéis, encargos, condomínio e contas de consumo.",
          "A entrega das chaves só se considera realizada com a assinatura do Termo de Vistoria de Saída e o aceite formal do LOCADOR. Havendo pendências, o aluguel e os encargos continuam devidos até a efetiva regularização.",
        ],
      },
      {
        titulo: "Cláusula 10ª — Da rescisão e da multa",
        paragrafos: [
          "A devolução do imóvel antes do término do prazo determinado sujeita o LOCATÁRIO ao pagamento de multa de [3] aluguéis vigentes, reduzida proporcionalmente ao período já cumprido do contrato (art. 4º da Lei 8.245/91).",
          "Não é devida multa quando a devolução antecipada decorrer de transferência do LOCATÁRIO, por seu empregador, para prestar serviços em outra localidade, desde que notificado o LOCADOR por escrito com 30 dias de antecedência (art. 4º, parágrafo único).",
          "O descumprimento de qualquer cláusula autoriza a parte inocente a rescindir o contrato e a promover as medidas cabíveis, inclusive a ação de despejo, respondendo o infrator pela multa compensatória de [3] aluguéis, sem prejuízo das perdas e danos.",
        ],
      },
      {
        titulo: "Cláusula 11ª — Do direito de preferência",
        paragrafos: [
          "Em caso de venda do imóvel, o LOCATÁRIO terá preferência para adquiri-lo em igualdade de condições com terceiros, devendo manifestar sua aceitação inequívoca no prazo de 30 dias contados da notificação escrita do LOCADOR com todas as condições do negócio (arts. 27 a 34 da Lei 8.245/91).",
        ],
      },
      {
        titulo: "Cláusula 12ª — Da proteção de dados e disposições gerais",
        paragrafos: [
          "As partes autorizam o tratamento dos dados pessoais estritamente necessários à celebração e à execução da locação, na forma da Lei 13.709/2018 (LGPD).",
          "Falecendo o LOCATÁRIO, a locação transmite-se aos herdeiros e sucessores residentes no imóvel (art. 11 da Lei 8.245/91). Em caso de separação ou dissolução de união estável, a locação prossegue com quem permanecer no imóvel, mediante comunicação escrita ao LOCADOR (art. 12).",
          "Este contrato, assinado por duas testemunhas, constitui título executivo extrajudicial.",
        ],
      },
      {
        titulo: "Cláusula 13ª — Do foro",
        paragrafos: [
          "As partes elegem o foro da situação do imóvel — comarca de [CIDADE DO FORO] — para dirimir as questões oriundas deste contrato, conforme o art. 58, II, da Lei 8.245/91.",
        ],
      },
      FECHAMENTO_PADRAO,
    ],
  },

  // ------------------------------------------------------------------
  {
    id: "intermediacao",
    aba: "Intermediação imobiliária",
    titulo: "Contrato de Prestação de Serviços de Intermediação Imobiliária (Corretagem)",
    resumo:
      "Modelo do contrato entre o proprietário (contratante) e o corretor ou a imobiliária, definindo o imóvel autorizado, prazo, exclusividade, percentual da comissão e quando ela se torna devida.",
    baseLegal:
      "Código Civil, arts. 722 a 729 (contrato de corretagem) — com destaque para o art. 725 (comissão devida pelo resultado útil, ainda que o negócio não se efetive por arrependimento das partes) e o art. 726 (exclusividade); Lei 6.530/78 e Resolução COFECI 458/95 (exercício da profissão e registro no CRECI).",
    clausulas: [
      {
        titulo: "Qualificação das partes",
        paragrafos: [
          "CONTRATANTE: [NOME DO CONTRATANTE], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [RG], inscrito(a) no CPF/CNPJ sob o nº [CPF/CNPJ DO CONTRATANTE], residente e domiciliado(a) na [ENDEREÇO COMPLETO DO CONTRATANTE], na qualidade de proprietário(a) ou legítimo(a) possuidor(a) do imóvel adiante descrito.",
          "CONTRATADO(A): [CORRETOR/IMOBILIÁRIA], corretor(a) de imóveis / pessoa jurídica devidamente inscrito(a) no CRECI-[UF] sob o nº [CRECI], CPF/CNPJ nº [CPF/CNPJ DO CORRETOR], com endereço profissional na [ENDEREÇO DO CORRETOR].",
        ],
      },
      {
        titulo: "Cláusula 1ª — Do objeto",
        paragrafos: [
          "O CONTRATANTE autoriza o CONTRATADO a intermediar a [VENDA / LOCAÇÃO] do imóvel [IMÓVEL], situado na [ENDEREÇO COMPLETO DO IMÓVEL], matrícula nº [Nº DA MATRÍCULA] do [CARTÓRIO DE REGISTRO DE IMÓVEIS].",
          "A intermediação compreende: a avaliação mercadológica do imóvel, a captação e a qualificação de interessados, a divulgação em portais e canais do CONTRATADO, o agendamento e o acompanhamento de visitas, a condução das negociações e o auxílio na reunião da documentação necessária ao fechamento.",
          "O CONTRATADO atua como mediador e não assume obrigação de resultado quanto à concretização do negócio, obrigando-se a empregar toda a diligência e prudência exigidas pela natureza do serviço (art. 723 do Código Civil).",
        ],
      },
      {
        titulo: "Cláusula 2ª — Do preço pretendido e das condições",
        paragrafos: [
          "O CONTRATANTE estabelece como preço pretendido o valor de [VALOR TOTAL] ([VALOR POR EXTENSO]), admitindo negociação até o limite mínimo de [VALOR MÍNIMO], abaixo do qual qualquer proposta dependerá de aprovação expressa do CONTRATANTE.",
          "Condições de pagamento aceitas: [À VISTA / FINANCIAMENTO BANCÁRIO / PERMUTA / PARCELAMENTO DIRETO — detalhar].",
        ],
      },
      {
        titulo: "Cláusula 3ª — Do prazo e da exclusividade",
        paragrafos: [
          "O presente contrato vigorará pelo prazo de [6] meses, contados de [DATA DE INÍCIO], prorrogável por igual período mediante manifestação escrita das partes ou, na ausência de denúncia por escrito com [15] dias de antecedência, por prazo indeterminado.",
          "( ) COM EXCLUSIVIDADE. Durante a vigência, o CONTRATANTE não poderá contratar outro corretor ou imobiliária para o mesmo imóvel. Nos termos do art. 726 do Código Civil, a comissão será integralmente devida ao CONTRATADO ainda que o negócio seja realizado diretamente pelo CONTRATANTE ou por terceiro, salvo se comprovada a inércia ou a ociosidade do CONTRATADO.",
          "( ) SEM EXCLUSIVIDADE. O CONTRATANTE poderá contratar outros profissionais, sendo devida a comissão apenas àquele que efetivamente aproximar as partes e obtiver o resultado útil da mediação. O CONTRATANTE se obriga a comunicar ao CONTRATADO, por escrito, a celebração do negócio com terceiro, no prazo de [5] dias.",
          "O CONTRATANTE se compromete a encaminhar ao CONTRATADO todo interessado que o procure diretamente durante a vigência deste contrato.",
        ],
      },
      {
        titulo: "Cláusula 4ª — Da comissão de corretagem",
        paragrafos: [
          "Pelos serviços de intermediação, o CONTRATANTE pagará ao CONTRATADO a comissão de [6]% ([POR EXTENSO] por cento) sobre o valor efetivo do negócio, no caso de venda; ou o equivalente a [1] aluguel mensal, no caso de locação, além da taxa de administração de [10]% sobre cada aluguel, se contratada a administração da locação.",
          "A comissão é devida a partir do momento em que o CONTRATADO obtiver o RESULTADO ÚTIL da mediação — isto é, quando aproximar as partes e estas chegarem a acordo quanto ao objeto e ao preço, ainda que o instrumento definitivo venha a ser assinado posteriormente.",
          "Nos termos expressos do art. 725 do Código Civil, a remuneração é devida ao CONTRATADO ainda que o negócio NÃO SE EFETIVE em razão de ARREPENDIMENTO das partes, uma vez alcançado o resultado útil da mediação.",
          "A comissão será paga no ato de [assinatura do contrato de compra e venda / recebimento do sinal / assinatura do contrato de locação], mediante [transferência bancária / dedução do valor recebido], com emissão da respectiva nota fiscal ou recibo (RPA) pelo CONTRATADO.",
          "Iniciado e concluído o negócio após a expiração do prazo deste contrato, a comissão continuará devida ao CONTRATADO se o comprador ou locatário tiver sido por ele apresentado ao CONTRATANTE durante a vigência, conforme relação de interessados que o CONTRATADO deverá entregar por escrito ao final do prazo (art. 727 do Código Civil).",
          "Havendo mais de um corretor na intermediação, a comissão será rateada em partes iguais, salvo ajuste diverso por escrito (art. 728 do Código Civil).",
        ],
      },
      {
        titulo: "Cláusula 5ª — Das obrigações do contratado",
        paragrafos: [
          "Manter registro ativo e regular no CRECI durante toda a vigência do contrato, exibindo-o quando solicitado — o exercício da corretagem por profissional não inscrito é irregular e compromete a exigibilidade da comissão.",
          "Prestar ao CONTRATANTE, espontaneamente, todas as informações sobre o andamento do negócio, incluindo propostas recebidas, ainda que abaixo do preço pretendido, e o retorno das visitas realizadas.",
          "Informar ao CONTRATANTE, sob pena de responder por perdas e danos, tudo o que possa influir nos resultados da transação, inclusive riscos jurídicos e restrições documentais identificadas (art. 723, parágrafo único, do Código Civil).",
          "Verificar a documentação do imóvel e das partes, orientando quanto às certidões necessárias, sem assumir a responsabilidade pela veracidade dos documentos fornecidos por terceiros.",
          "Guardar sigilo sobre as informações e os dados pessoais a que tiver acesso, tratando-os na forma da Lei 13.709/2018 (LGPD), exclusivamente para as finalidades deste contrato.",
          "Prestar contas de quaisquer valores recebidos por conta do CONTRATANTE, repassando-os no prazo de [2] dias úteis.",
        ],
      },
      {
        titulo: "Cláusula 6ª — Das obrigações do contratante",
        paragrafos: [
          "Fornecer ao CONTRATADO documentação completa e verídica do imóvel e de sua titularidade, bem como informar quaisquer ônus, gravames, litígios, dívidas condominiais, tributárias ou vícios ocultos que recaiam sobre o bem.",
          "Permitir o acesso ao imóvel para fotos, vídeos e visitas de interessados, em horários previamente combinados.",
          "Não negociar diretamente com interessados apresentados pelo CONTRATADO com o objetivo de suprimir ou reduzir a comissão devida, hipótese em que a remuneração permanecerá integralmente exigível.",
          "Comunicar ao CONTRATADO qualquer alteração no preço, nas condições ou na disponibilidade do imóvel.",
        ],
      },
      {
        titulo: "Cláusula 7ª — Da autorização de divulgação",
        paragrafos: [
          "O CONTRATANTE autoriza o CONTRATADO a divulgar o imóvel, com fotos e informações, em portais imobiliários, redes sociais, placas no local e demais canais de publicidade, inclusive na plataforma Rede Impulso, pelo prazo de vigência deste contrato.",
          "( ) O CONTRATANTE NÃO autoriza a instalação de placa no imóvel nem a divulgação do endereço completo.",
        ],
      },
      {
        titulo: "Cláusula 8ª — Da rescisão",
        paragrafos: [
          "Este contrato poderá ser rescindido por qualquer das partes, mediante notificação escrita com [15] dias de antecedência, permanecendo devida a comissão relativa a negócios já encaminhados ou a interessados já apresentados na forma da Cláusula 4ª.",
          "A rescisão por iniciativa do CONTRATANTE, sem justa causa e havendo cláusula de exclusividade, não afasta o direito do CONTRATADO à comissão nos negócios concluídos com interessados por ele captados.",
        ],
      },
      {
        titulo: "Cláusula 9ª — Do foro",
        paragrafos: [
          "As partes elegem o foro da comarca de [CIDADE DO FORO] para dirimir eventuais controvérsias decorrentes deste contrato, com renúncia a qualquer outro.",
        ],
      },
      FECHAMENTO_PADRAO,
    ],
  },
];

// ====================================================================
// Checklist de documentos
// ====================================================================

export type ItemChecklist = {
  id: string;
  nome: string;
  detalhe?: string;
  opcional?: boolean;
};

export type GrupoChecklist = {
  id: string;
  titulo: string;
  subtitulo: string;
  itens: ItemChecklist[];
};

export type ChecklistFinalidade = {
  id: "venda" | "locacao";
  aba: string;
  observacao: string;
  grupos: GrupoChecklist[];
};

export const CHECKLISTS: ChecklistFinalidade[] = [
  {
    id: "venda",
    aba: "Compra e venda",
    observacao:
      "As certidões têm prazo de validade (em geral 30 a 90 dias) e costumam ser exigidas atualizadas na data da escritura. Se houver financiamento, o banco pede a mesma documentação com validade própria — recolha tudo com no máximo 30 dias de antecedência da assinatura.",
    grupos: [
      {
        id: "venda-vendedor",
        titulo: "Vendedor",
        subtitulo: "Documentos pessoais, do cônjuge e do imóvel",
        itens: [
          { id: "v-rg", nome: "RG e CPF do vendedor e do cônjuge", detalhe: "Ou CNH válida. Cópia simples + original na escritura." },
          { id: "v-estado-civil", nome: "Certidão de casamento atualizada", detalhe: "Emitida há menos de 90 dias. Com averbação de divórcio, se houver, e pacto antenupcial registrado quando o regime não for o legal." },
          { id: "v-nascimento", nome: "Certidão de nascimento (se solteiro)", detalhe: "Se houver união estável, declaração ou escritura pública de união estável." },
          { id: "v-residencia", nome: "Comprovante de residência", detalhe: "Emitido nos últimos 3 meses." },
          { id: "v-profissao", nome: "Declaração de profissão e nacionalidade", detalhe: "Exigida na qualificação da escritura." },
          { id: "v-matricula", nome: "Matrícula atualizada do imóvel", detalhe: "Certidão de inteiro teor do Cartório de Registro de Imóveis, emitida há menos de 30 dias." },
          { id: "v-onus", nome: "Certidão negativa de ônus reais e de ações reipersecutórias", detalhe: "Do mesmo Cartório de Registro de Imóveis. Revela hipoteca, penhora, alienação fiduciária e usufruto." },
          { id: "v-iptu", nome: "Certidão negativa de débitos de IPTU / carnê quitado", detalhe: "Emitida pela Prefeitura; confere também o valor venal para cálculo do ITBI." },
          { id: "v-tributos-mun", nome: "Certidão negativa de tributos municipais" },
          { id: "v-condominio", nome: "Declaração de quitação de condomínio", detalhe: "Assinada pelo síndico ou pela administradora. Dívida de condomínio é obrigação propter rem e acompanha o imóvel." },
          { id: "v-federal", nome: "Certidão conjunta negativa de débitos federais e dívida ativa da União", detalhe: "Receita Federal / PGFN." },
          { id: "v-estadual", nome: "Certidão negativa estadual" },
          { id: "v-trabalhista", nome: "Certidão negativa de débitos trabalhistas (CNDT)", detalhe: "Tribunal Superior do Trabalho." },
          { id: "v-justica", nome: "Certidões dos distribuidores cíveis, fiscais e criminais", detalhe: "Justiça Estadual e Federal do domicílio e da situação do imóvel — para afastar fraude à execução." },
          { id: "v-pj", nome: "Se pessoa jurídica: contrato social, CNPJ, CND da empresa e ata de eleição", detalhe: "Mais certidão de regularidade do FGTS e certidão da Junta Comercial.", opcional: true },
          { id: "v-espolio", nome: "Se espólio: formal de partilha ou escritura de inventário", opcional: true },
          { id: "v-habite", nome: "Habite-se / averbação de construção", detalhe: "Obra não averbada na matrícula impede o financiamento bancário.", opcional: true },
        ],
      },
      {
        id: "venda-comprador",
        titulo: "Comprador",
        subtitulo: "Documentos pessoais e, se houver, do financiamento",
        itens: [
          { id: "c-rg", nome: "RG e CPF do comprador e do cônjuge", detalhe: "Ou CNH válida." },
          { id: "c-estado-civil", nome: "Certidão de casamento ou nascimento atualizada", detalhe: "Com pacto antenupcial, se houver regime diverso do legal." },
          { id: "c-residencia", nome: "Comprovante de residência atualizado" },
          { id: "c-profissao", nome: "Declaração de profissão e nacionalidade" },
          { id: "c-renda", nome: "Comprovante de renda", detalhe: "Holerites dos 3 últimos meses, declaração de IR ou extratos — obrigatório no financiamento." },
          { id: "c-fgts", nome: "Extrato do FGTS e carteira de trabalho", detalhe: "Se pretende usar o FGTS na aquisição (regras da Caixa: imóvel residencial urbano, não ser proprietário de outro na mesma região).", opcional: true },
          { id: "c-financiamento", nome: "Documentação exigida pelo banco", detalhe: "Ficha cadastral, análise de crédito aprovada, laudo de avaliação do imóvel e minuta do contrato com força de escritura.", opcional: true },
          { id: "c-itbi", nome: "Guia de ITBI recolhida", detalhe: "Emitida pela Prefeitura; o registro da escritura não é feito sem ela. Ônus do comprador, salvo acordo diverso." },
          { id: "c-custas", nome: "Reserva para custas de cartório e registro", detalhe: "Emolumentos de escritura + registro. Some ITBI e cartório: costuma ficar entre 4% e 6% do valor do imóvel." },
        ],
      },
    ],
  },
  {
    id: "locacao",
    aba: "Locação",
    observacao:
      "Na locação não se exige matrícula atualizada, certidões negativas do vendedor nem ITBI. Em compensação, a análise recai sobre a capacidade de pagamento do locatário e sobre a garantia locatícia escolhida — e a lei proíbe exigir mais de uma garantia no mesmo contrato (art. 37, parágrafo único, da Lei 8.245/91).",
    grupos: [
      {
        id: "loc-locador",
        titulo: "Locador (proprietário)",
        subtitulo: "Comprovação de titularidade e condições do imóvel",
        itens: [
          { id: "l-rg", nome: "RG e CPF do locador (ou CNPJ e contrato social)" },
          { id: "l-residencia", nome: "Comprovante de residência" },
          { id: "l-titularidade", nome: "Comprovante de propriedade do imóvel", detalhe: "Matrícula, escritura ou contrato de compra e venda — basta comprovar a titularidade, não é necessária certidão atualizada." },
          { id: "l-iptu", nome: "Carnê de IPTU do exercício", detalhe: "Para identificar a inscrição imobiliária e o valor rateado." },
          { id: "l-condominio", nome: "Convenção e regulamento interno do condomínio", detalhe: "Entregues ao locatário; ele responde por multas de infrações que der causa.", opcional: true },
          { id: "l-dados-bancarios", nome: "Dados bancários para recebimento" },
          { id: "l-procuracao", nome: "Procuração para a imobiliária administrar", detalhe: "Quando a locação for administrada por terceiro.", opcional: true },
          { id: "l-vistoria", nome: "Laudo de vistoria de entrada com fotos", detalhe: "Anexo obrigatório na prática: é ele que define o estado a ser devolvido." },
        ],
      },
      {
        id: "loc-locatario",
        titulo: "Locatário (inquilino)",
        subtitulo: "Identificação, renda e garantia",
        itens: [
          { id: "t-rg", nome: "RG e CPF do locatário e do cônjuge" },
          { id: "t-estado-civil", nome: "Certidão de casamento ou nascimento" },
          { id: "t-residencia", nome: "Comprovante de residência atual" },
          { id: "t-renda", nome: "Comprovante de renda", detalhe: "3 últimos holerites, extratos bancários ou declaração de IR. Praxe de mercado: renda familiar de 3x o valor do aluguel + encargos." },
          { id: "t-autonomo", nome: "Se autônomo ou PJ: DECORE, extratos, contrato social e faturamento", opcional: true },
          { id: "t-cadastro", nome: "Ficha cadastral preenchida e consulta a órgãos de proteção ao crédito", detalhe: "Com autorização expressa do candidato para a consulta (LGPD)." },
          { id: "t-referencias", nome: "Referências pessoais e de locações anteriores", detalhe: "Contato do locador anterior e declaração de adimplência." },
          { id: "t-fiador", nome: "GARANTIA — Fiador: RG, CPF, comprovantes de renda e residência, certidão de casamento e matrícula de imóvel quitado", detalhe: "Praxe: imóvel quitado na mesma comarca, com anuência do cônjuge. Fiador responde solidariamente até a devolução das chaves.", opcional: true },
          { id: "t-caucao", nome: "GARANTIA — Caução: comprovante de depósito em poupança conjunta", detalhe: "Limite legal de 3 meses de aluguel (art. 38, § 2º, da Lei 8.245/91).", opcional: true },
          { id: "t-seguro", nome: "GARANTIA — Seguro-fiança: proposta aprovada e apólice", detalhe: "Renovação anual é ônus do locatário durante toda a locação.", opcional: true },
          { id: "t-capitalizacao", nome: "GARANTIA — Título de capitalização caucionado", opcional: true },
          { id: "t-consumo", nome: "Transferência das contas de consumo para o seu nome", detalhe: "Água, energia e gás, a partir da data de entrada." },
        ],
      },
    ],
  },
];
