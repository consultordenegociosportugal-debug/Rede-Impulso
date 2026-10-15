import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { BuscaHome } from "./busca-home";
import { ImovelCard } from "@/components/imovel-card";
import { TickerMercado } from "@/components/ticker-mercado";
import { EstatisticasRede } from "@/components/estatisticas-rede";
import { ComoVaiUsar } from "@/components/como-vai-usar";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const OBJETIVOS = [
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
      "2 imóveis ativos sempre grátis, pra sempre, com todas as funcionalidades liberadas — inclusive agendamento automático. Pra publicar mais ao mesmo tempo, tem o Plano Profissional.",
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

type ImovelDestaque = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  finalidade: "venda" | "aluguel";
  quartos: number | null;
  destaque_ate: string | null;
  imovel_fotos: { arquivo_url: string; ordem: number }[];
};

const LIMITE_HOME = 6;
const COLUNAS_HOME =
  "id, titulo, bairro, cidade, preco, finalidade, quartos, destaque_ate, imovel_fotos(arquivo_url, ordem)";

// Home do módulo imobiliário — só aparece com ele ativo (ver src/lib/modulos.ts).
export async function HomeImobiliaria() {
  const supabase = await createClient();
  const { data: dadosDestaque } = await supabase
    .from("imoveis")
    .select(COLUNAS_HOME)
    .eq("status", "publicado")
    .gt("destaque_ate", new Date().toISOString())
    .order("destaque_ate", { ascending: true })
    .limit(LIMITE_HOME);

  const destacados = (dadosDestaque ?? []) as unknown as ImovelDestaque[];
  const idsDestacados = destacados.map((i) => i.id);

  let queryResto = supabase
    .from("imoveis")
    .select(COLUNAS_HOME)
    .eq("status", "publicado")
    .order("created_at", { ascending: false })
    .limit(LIMITE_HOME);
  if (idsDestacados.length > 0) {
    queryResto = queryResto.not("id", "in", `(${idsDestacados.join(",")})`);
  }
  const { data: dadosResto } = await queryResto;
  const resto = (dadosResto ?? []) as unknown as ImovelDestaque[];

  const imoveisRecentes = [...destacados, ...resto].slice(0, LIMITE_HOME);

  return (
    <>
      <Nav active="/" />

      <TickerMercado />

      <main className={styles.centro}>
        <h1 className={styles.headline}>
          Todo negócio fechado começa com{" "}
          <span className={styles.accent}>um impulso</span>.
        </h1>
        <p className={styles.tagline}>O que podemos fazer por você hoje?</p>

        <BuscaHome />

        <div className={styles.provaSocial}>
          <EstatisticasRede />
        </div>

        <div className={styles.linksSecundarios}>
          <Link href="/sobre">Como funciona</Link>
        </div>
      </main>

      {imoveisRecentes.length > 0 && (
        <div className="wrap" style={{ paddingBottom: 64 }}>
          <div className="flex between items-center mb-16" style={{ flexWrap: "wrap", gap: 12 }}>
            <h2 style={{ fontSize: 20, margin: 0 }}>Imóveis publicados agora</h2>
            <Link href="/imoveis" className="btn btn-ghost btn-sm">
              Ver todos os imóveis →
            </Link>
          </div>
          <div className="grid grid-3">
            {imoveisRecentes.map((imovel) => {
              const foto = [...imovel.imovel_fotos].sort((a, b) => a.ordem - b.ordem)[0];
              return (
                <ImovelCard
                  key={imovel.id}
                  imovel={{
                    id: imovel.id,
                    titulo: imovel.titulo,
                    bairro: imovel.bairro,
                    cidade: imovel.cidade,
                    preco: imovel.preco,
                    finalidade: imovel.finalidade,
                    specs: imovel.quartos ? `${imovel.quartos}q` : undefined,
                    fotoUrl: foto?.arquivo_url ?? null,
                    destaque: Boolean(
                      imovel.destaque_ate && new Date(imovel.destaque_ate) > new Date(),
                    ),
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

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
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como você vai usar a Rede Impulso?</span>
            <h2>Escolha a opção que melhor te descreve</h2>
          </div>
          <ComoVaiUsar />
        </div>
      </section>

      <section>
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

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <p className="muted">
            Quer publicar mais imóveis ao mesmo tempo?{" "}
            <Link href="/planos" style={{ textDecoration: "underline" }}>
              Veja o Plano Profissional
            </Link>
            .
          </p>
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
