import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { SuporteForm } from "./suporte-form";

const FAQ: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Como eu agendo uma visita com um corretor?",
    resposta:
      "Vá em \"Buscar\" (ou /buscar-profissionais), encontre o corretor por nome, cidade ou proximidade, abra o perfil dele e escolha um horário livre. A visita já sai confirmada na hora.",
  },
  {
    pergunta: "Como cancelo uma visita agendada?",
    resposta:
      "Tanto o corretor (em \"Minhas visitas\") quanto o cliente (em \"Meus agendamentos\") podem cancelar diretamente pelo app — basta tocar em \"Cancelar\" e, se quiser, informar o motivo. A outra pessoa é avisada automaticamente por e-mail e WhatsApp.",
  },
  {
    pergunta: "Dá pra instalar a Rede Impulso no celular, tipo um app?",
    resposta:
      "Sim — veja o passo a passo em \"Instalar app\" aqui embaixo. É um atalho com ícone próprio que abre em tela cheia, sem precisar baixar nada de loja.",
  },
  {
    pergunta: "Sou corretor — como configuro meus horários de atendimento?",
    resposta:
      "Em \"Minha disponibilidade\", marque os dias e horários em que você atende. Só esses horários aparecem como livres pra quem for agendar com você.",
  },
  {
    pergunta: "Posso cadastrar um cliente que não tem conta na Rede Impulso?",
    resposta:
      "Sim — em \"Meus clientes\", cadastre nome e telefone e já agende na hora. O cliente não precisa criar conta nenhuma.",
  },
  {
    pergunta: "Como excluo minha conta?",
    resposta:
      "Em \"Editar perfil\", na seção \"Excluir conta\". A exclusão é definitiva e apaga seu cadastro, agenda e histórico de visitas.",
  },
  {
    pergunta: "Meus dados estão seguros?",
    resposta:
      "Sim — usamos controle de acesso por linha no banco de dados (cada pessoa só vê o que tem permissão) e conexão criptografada. Detalhes na nossa Política de Privacidade.",
  },
];

export default async function SuportePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nomeAtual = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .single();
    nomeAtual = profile?.nome ?? "";
  }

  return (
    <>
      <Nav active="/suporte" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Central de ajuda</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Como podemos ajudar?</h1>
        <p className="muted mb-24">
          Respostas rápidas pras dúvidas mais comuns — e se não resolver, manda um chamado
          pra gente aqui embaixo.
        </p>

        <div className="grid grid-2" style={{ gap: 32, alignItems: "start" }}>
          <div>
            <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Perguntas frequentes</h2>
            {FAQ.map((item) => (
              <details key={item.pergunta} className="card mb-8" style={{ padding: "14px 16px" }}>
                <summary style={{ fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                  {item.pergunta}
                </summary>
                <p className="muted" style={{ marginTop: 8, marginBottom: 0, fontSize: 13.5 }}>
                  {item.resposta}
                </p>
              </details>
            ))}
          </div>

          <div>
            <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Não encontrou o que precisava?</h2>
            <SuporteForm nomeAtual={nomeAtual} emailAtual={user?.email ?? ""} />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
