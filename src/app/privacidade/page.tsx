import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default function PrivacidadePage() {
  return (
    <>
      <Nav active="/privacidade" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span className="eyebrow">Documento legal</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Política de Privacidade
          </h1>
          <p className="hint">Última atualização: a definir na publicação</p>

          <div className="card" style={{ background: "var(--amber-tint)", marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>
              ⚠️ <strong>Rascunho de trabalho.</strong> Este texto segue a
              estrutura da LGPD (Lei 13.709/2018) como ponto de partida, mas
              ainda não passou por revisão de um advogado especializado.
              Não publique nem trate como vinculante antes dessa validação.
            </p>
          </div>

          <div style={{ fontSize: 14.5, lineHeight: 1.7 }}>
            <h2 style={{ fontSize: 18, marginTop: 28 }}>1. Quem somos</h2>
            <p>
              A Rede Impulso é a controladora dos dados pessoais tratados
              nesta plataforma, nos termos da Lei Geral de Proteção de Dados
              (LGPD).
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>2. Quais dados coletamos</h2>
            <ul>
              <li>
                <strong>Cadastro:</strong> nome, telefone, e-mail, senha
                (armazenada de forma criptografada), data de nascimento, rede
                social
              </li>
              <li>
                <strong>Corretor:</strong> CRECI, bairros e cidade de atuação
                e, opcionalmente, documentos de identidade enviados para
                reforçar a confiança no perfil público
              </li>
              <li>
                <strong>Agendamento:</strong> dias e horários de
                disponibilidade, visitas marcadas, dados de clientes
                cadastrados por um corretor sem conta própria, avaliações
                (NPS) após cada visita
              </li>
              <li>
                <strong>Uso da plataforma:</strong> matrículas em cursos
              </li>
            </ul>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              3. Para que usamos esses dados
            </h2>
            <ul>
              <li>Criar e manter sua conta</li>
              <li>Conectar clientes a corretores e corretores à construtora/imobiliária que os gerencia</li>
              <li>Viabilizar o agendamento direto de visitas e seus lembretes por e-mail</li>
              <li>Calcular métricas de atendimento para o gestor da organização do corretor</li>
              <li>Processar matrículas em cursos</li>
              <li>Cumprir obrigações legais e prevenir fraude</li>
            </ul>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              4. Com quem compartilhamos
            </h2>
            <p>
              Dados de contato são compartilhados entre o corretor e o
              cliente de uma mesma visita agendada (é assim que um consegue
              falar com o outro). O gestor de uma organização vê apenas
              métricas agregadas dos corretores vinculados a ela — não vê
              dados de contato dos clientes. Documentos de verificação
              enviados por corretores são vistos apenas pela equipe de
              administração da Rede Impulso. Não vendemos dados pessoais a
              terceiros. Pagamentos de cursos são processados por um provedor
              externo (Mercado Pago), sujeito à política de privacidade
              própria dele.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              5. Por quanto tempo guardamos
            </h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa e pelo
              prazo necessário para cumprir obrigações legais após o
              encerramento, o que será detalhado na versão final deste
              documento.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>6. Como protegemos seus dados</h2>
            <p>
              Usamos controle de acesso por linha (RLS) no banco de dados —
              cada pessoa só acessa os dados que tem permissão de ver —,
              conexão criptografada (HTTPS/TLS) e um repositório privado
              para documentos sensíveis, acessível apenas por você e pela
              administração.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              7. Seus direitos (Art. 18 da LGPD)
            </h2>
            <p>Você pode solicitar, a qualquer momento:</p>
            <ul>
              <li>Confirmação de que tratamos seus dados</li>
              <li>Acesso aos seus dados</li>
              <li>Correção de dados incompletos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Eliminação dos dados tratados com seu consentimento</li>
              <li>Informação sobre com quem compartilhamos seus dados</li>
              <li>Revogação do consentimento</li>
            </ul>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>
              8. Como exercer esses direitos
            </h2>
            <p>
              Para eliminar seus dados, você pode excluir sua própria conta a
              qualquer momento em &quot;Editar perfil&quot;. Para os demais
              direitos, entre em contato pelo e-mail de contato a definir —
              vamos responder dentro do prazo legal aplicável.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>9. Cookies</h2>
            <p>
              Usamos apenas cookies essenciais, necessários para manter sua
              sessão de login. Não usamos cookies de rastreamento ou
              publicidade nesta versão da plataforma.
            </p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>10. Encarregado de dados (DPO)</h2>
            <p>Contato do encarregado: a definir.</p>

            <h2 style={{ fontSize: 18, marginTop: 28 }}>11. Alterações</h2>
            <p>
              Podemos atualizar esta política periodicamente. Mudanças
              relevantes serão comunicadas pela plataforma.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
