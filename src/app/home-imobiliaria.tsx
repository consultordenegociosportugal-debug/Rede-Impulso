import Link from "next/link";
import { Nav } from "@/components/nav";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import { SOBRE_PARAGRAFOS, SOBRE_MODULOS, OBJETIVOS } from "@/lib/conteudo-institucional";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const FUNCIONALIDADES = [
  { icone: "🗓️", titulo: "Agendamento automático de visitas" },
  { icone: "🤖", titulo: "IA que escreve o anúncio pra você" },
  { icone: "📍", titulo: "Sugestão automática por bairro" },
  { icone: "🏅", titulo: "Selo profissional" },
  { icone: "💬", titulo: "Mural de conquistas" },
  { icone: "🚀", titulo: "Destaque pago do anúncio" },
];

const COMO_COMECAR = [
  {
    numero: "1",
    titulo: "Faça seu cadastro",
    texto: "Corretor autônomo, imobiliária ou construtora — escolha a opção certa.",
  },
  {
    numero: "2",
    titulo: "Configure sua disponibilidade",
    texto: "Dias e horários em que você atende visitas, em poucos minutos.",
  },
  {
    numero: "3",
    titulo: "Receba agendamentos confirmados",
    texto: "Cliente escolhe um horário livre e a visita já nasce confirmada.",
  },
];

const PERGUNTAS = [
  {
    pergunta: "Preciso ter CNPJ pra me cadastrar?",
    resposta:
      "Corretor autônomo não precisa — só CPF e CRECI. Imobiliária e construtora se cadastram com CNPJ.",
  },
  {
    pergunta: "O cadastro grátis tem alguma limitação?",
    resposta:
      "2 imóveis ativos e 2 corretores na equipe sempre grátis, pra sempre, com todas as funcionalidades liberadas — inclusive agendamento automático. Pra ampliar a equipe, tem os planos a partir de R$ 69,90/mês.",
  },
  {
    pergunta: "O cliente paga pra agendar uma visita?",
    resposta: "Não. Agendar visita e usar a Rede Impulso como cliente é sempre grátis.",
  },
  {
    pergunta: "Como funciona o lembrete de horário?",
    resposta:
      "Um e-mail automático é enviado pro interessado e pro responsável cerca de 2 horas antes da visita confirmada.",
  },
  {
    pergunta: "Posso mudar de plano depois?",
    resposta: "Sim — a troca de plano vale a partir do próximo vencimento da assinatura.",
  },
];

// Home — núcleo permanente da plataforma (ver src/lib/modulos.ts). Sem
// vitrine de imóveis: a landing é só apresentação e escolha de papel,
// igual à referência (appbarber.com.br) — quem quer ver imóvel vai em
// /imoveis depois de escolher "sou cliente".
export function HomeImobiliaria() {
  return (
    <>
      <Nav active="/" />

      <main className={styles.centro}>
        <h1 className={styles.headline}>
          Todo negócio fechado começa com{" "}
          <span className={styles.accent}>um impulso</span>.
        </h1>
        <p className={styles.tagline}>
          Agendamento e gestão para corretores, imobiliárias, construtoras e seus clientes.
        </p>
        <Link href="/comece-agora" className="btn btn-primary">
          Comece agora →
        </Link>
      </main>

      <section id="sobre">
        <div className="wrap-narrow">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Sobre a Rede Impulso</span>
          </div>
          {SOBRE_PARAGRAFOS.map((p) => (
            <p key={p} className="muted" style={{ fontSize: 15 }}>
              {p}
            </p>
          ))}
          <p className="muted" style={{ fontSize: 15 }}>O sistema é dividido em dois módulos:</p>
          <ul style={{ margin: 0 }}>
            {SOBRE_MODULOS.map((m) => (
              <li key={m.titulo} className="muted" style={{ fontSize: 15, marginBottom: 8 }}>
                <strong style={{ color: "var(--ink)" }}>{m.titulo}</strong> — {m.texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Nosso objetivo</span>
            <h2>Feito pra quem vive de visita e negócio fechado</h2>
          </div>
          <div className="grid grid-3">
            {OBJETIVOS.map((o) => (
              <div key={o.titulo} className="card">
                <div style={{ fontSize: 22 }}>{o.icone}</div>
                <strong style={{ fontSize: 15, display: "block", margin: "8px 0 4px" }}>
                  {o.titulo}
                </strong>
                <p className="hint" style={{ marginBottom: 0 }}>{o.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="funcionalidades">
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Funcionalidades</span>
            <h2>O que a Rede Impulso faz por você</h2>
          </div>
          <div className="grid grid-3">
            {FUNCIONALIDADES.map((f) => (
              <div key={f.titulo} className="card-flat flex items-center gap-8" style={{ fontSize: 14 }}>
                <span style={{ fontSize: 18 }} aria-hidden="true">{f.icone}</span>
                <strong>{f.titulo}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como começar</span>
            <h2>Três passos até o primeiro agendamento</h2>
          </div>
          <div className="grid grid-3">
            {COMO_COMECAR.map((passo) => (
              <div key={passo.numero} className="card">
                <div style={{ fontSize: 20 }}>{passo.numero}️⃣</div>
                <strong style={{ fontSize: 14.5 }}>{passo.titulo}</strong>
                <p className="hint" style={{ marginBottom: 0 }}>{passo.texto}</p>
              </div>
            ))}
          </div>
          <Link href="/comece-agora" className="btn btn-primary mt-24">
            Começar agora →
          </Link>
        </div>
      </section>

      <section id="precos">
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Preços</span>
            <h2>Até 2 corretores na equipe sempre grátis</h2>
          </div>
          <p className="muted">
            Quer convidar mais gente pra equipe?{" "}
            <Link href="/planos" style={{ textDecoration: "underline" }}>
              Veja os planos a partir de R$ 69,90/mês
            </Link>
            .
          </p>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como você vai usar a Rede Impulso?</span>
            <h2>Escolha a opção que melhor te descreve</h2>
          </div>
          <ComoVaiUsar />
        </div>
      </section>

      <section>
        <div className="wrap-narrow">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Perguntas frequentes</span>
            <h2>Tirando suas dúvidas</h2>
          </div>
          {PERGUNTAS.map((p) => (
            <details key={p.pergunta} className={styles.faqItem}>
              <summary>{p.pergunta}</summary>
              <p className="muted" style={{ marginTop: 8 }}>{p.resposta}</p>
            </details>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
