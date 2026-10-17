import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function TermosDeUsoPage() {
  return (
    <>
      <Nav active="/termos-de-uso" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="eyebrow">Documento legal</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Termos de Uso</h1>
          <p className="hint">Última atualização: a definir na publicação</p>

          <div className="card" style={{ background: "var(--amber-tint)", marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>
              ⚠️ <strong>Rascunho de trabalho.</strong> Este texto foi redigido
              como ponto de partida e ainda não passou por revisão de um
              advogado. Não publique nem trate como vinculante antes dessa
              validação.
            </p>
          </div>

          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 18, marginTop: 28 }}>1. Aceitação</h2>
            <p>
              Ao criar uma conta ou usar a Rede Impulso, você concorda com
              estes Termos de Uso e com a nossa{" "}
              <a href="/privacidade" style={{ textDecoration: "underline" }}>
                Política de Privacidade
              </a>
              . Se não concordar, não utilize a plataforma.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>2. O que é a Rede Impulso</h2>
            <p>
              A Rede Impulso é uma plataforma de <strong>agendamento direto
              entre corretores de imóveis e clientes</strong>: o corretor
              organiza sua própria agenda de atendimento e o cliente marca um
              horário de visita diretamente com ele, sem troca de mensagens.
              Um corretor também pode estar vinculado a uma construtora ou
              imobiliária cadastrada no catálogo, cujo gestor acompanha os
              números agregados dos corretores vinculados a ela. A Rede
              Impulso também oferece cursos de capacitação, independentes do
              agendamento. A Rede Impulso <strong>intermedia o agendamento</strong>,
              mas não é parte na visita, na negociação ou em qualquer
              contrato firmado entre corretor e cliente.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>3. Cadastro</h2>
            <p>
              Você é responsável pela veracidade dos dados informados no
              cadastro. Corretores podem, opcionalmente, enviar documentos de
              identidade e CRECI para reforçar a confiança no perfil público
              — esse envio não é obrigatório para usar a plataforma.
              Cadastros com informações falsas podem ser suspensos ou
              encerrados.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              4. Agendamento de visitas
            </h2>
            <p>
              O corretor é responsável por manter sua disponibilidade
              atualizada e por comparecer aos horários confirmados. O
              cliente é responsável por comparecer ou cancelar com
              antecedência um agendamento que não possa cumprir. A Rede
              Impulso não garante o comparecimento de nenhuma das partes nem
              a conclusão de qualquer negócio imobiliário discutido na
              visita.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>5. Cursos e pagamentos</h2>
            <p>
              Matrículas em cursos reservam a vaga; o pagamento é processado
              por um provedor externo (Mercado Pago). Condições de reembolso
              e cancelamento serão detalhadas na tela de cada curso.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>6. Condutas proibidas</h2>
            <ul>
              <li>Publicar informações falsas ou enganosas</li>
              <li>Assediar, ameaçar ou discriminar outros usuários</li>
              <li>Usar a plataforma para fins fraudulentos</li>
              <li>Tentar acessar dados de outros usuários sem autorização</li>
            </ul>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>7. Limitação de responsabilidade</h2>
            <p>
              A Rede Impulso não garante a conclusão de nenhum negócio e não
              se responsabiliza por prejuízos decorrentes de negociações
              entre usuários. Recomendamos cautela e verificação
              independente antes de qualquer pagamento ou assinatura de
              contrato.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>8. Encerramento de conta</h2>
            <p>
              Você pode excluir sua própria conta a qualquer momento em
              &quot;Editar perfil&quot;, o que apaga seu cadastro e todos os
              seus dados (agenda, clientes, histórico de visitas) de forma
              definitiva. Podemos suspender contas que violem estes Termos.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>9. Alterações</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Mudanças
              relevantes serão comunicadas pela plataforma.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>10. Lei aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis do Brasil, com foro a ser
              definido na versão final revisada por advogado.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>11. Contato</h2>
            <p>Dúvidas sobre estes Termos: e-mail de contato a definir.</p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
