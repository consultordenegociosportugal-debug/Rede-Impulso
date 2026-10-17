import Link from "next/link";
import { Nav } from "@/components/nav";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import { SOBRE_PARAGRAFOS, SOBRE_MODULOS, OBJETIVOS } from "@/lib/conteudo-institucional";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";
import { MARKETPLACE_ATIVO } from "@/lib/modulos";

const FUNCIONALIDADES = [
  { icone: "🗓️", titulo: "Agendamento automático de visitas" },
  { icone: "🙋", titulo: "Cadastro de cliente sem login" },
  { icone: "🔔", titulo: "Lembrete automático por e-mail" },
  { icone: "📅", titulo: "Sincronização com Google Agenda" },
  { icone: "📊", titulo: "Relatório de visitas" },
  { icone: "🏅", titulo: "Selo profissional" },
];

const COMO_COMECAR = [
  {
    numero: "1",
    titulo: "Faça seu cadastro de corretor",
    texto: "Só CPF e CRECI — leva poucos minutos.",
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
    resposta: "Não. O cadastro de corretor autônomo é só com CPF e CRECI.",
  },
  {
    pergunta: "O cadastro tem alguma limitação?",
    resposta:
      "Não. Cadastro, agendamento e lembrete por e-mail são sempre grátis, sem limite de visitas ou de clientes.",
  },
  {
    pergunta: "O cliente paga pra agendar uma visita?",
    resposta: "Não. Agendar visita e usar a Rede Impulso como cliente é sempre grátis.",
  },
  {
    pergunta: "O cliente precisa ter conta pra agendar?",
    resposta:
      "Não necessariamente — você pode cadastrar o cliente na hora, com nome e telefone, sem ele precisar criar login nenhum.",
  },
  {
    pergunta: "Como funciona o lembrete de horário?",
    resposta:
      "Um e-mail automático é enviado pro cliente e pro corretor cerca de 2 horas antes da visita confirmada.",
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
          Agendamento direto entre corretor e cliente — sem trocar mensagem pra combinar
          dia e hora.
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

      {MARKETPLACE_ATIVO && (
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
      )}

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
