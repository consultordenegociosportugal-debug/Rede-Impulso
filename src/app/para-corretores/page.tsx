import Link from "next/link";
import { Nav } from "@/components/nav";
import { EstatisticasRede } from "@/components/estatisticas-rede";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";
import styles from "./page.module.css";

export const metadata = {
  title: "Para corretores e imobiliárias | Rede Impulso",
  description:
    "2 imóveis ativos grátis pra sempre, descrição de anúncio escrita por IA, sugestão automática por bairro e selo profissional depois do 1º negócio.",
};

const BENEFICIOS = [
  {
    icone: "🤖",
    titulo: "IA que escreve o anúncio pra você",
    texto:
      "Gere a descrição do imóvel a partir dos dados do formulário, ou peça pra IA melhorar um texto que você já escreveu — sem inventar nada que você não informou.",
  },
  {
    icone: "📍",
    titulo: "Sugestão automática por bairro",
    texto:
      "Quando alguém publica um imóvel no seu bairro de atuação, você entra na lista de corretores sugeridos pro vendedor — sem precisar correr atrás.",
  },
  {
    icone: "🏅",
    titulo: "Selo profissional",
    texto:
      "Seu perfil ganha selo de avaliação depois do primeiro negócio fechado, e se destaca pra quem está decidindo em quem confiar.",
  },
  {
    icone: "💬",
    titulo: "Mural de conquistas",
    texto:
      "Cada negócio fechado pode virar depoimento público com estrelas de carreira — prova social real, que você não precisa pedir.",
  },
  {
    icone: "📈",
    titulo: "Publique de graça, cresça quando quiser",
    texto:
      "2 imóveis ativos e 2 corretores na equipe sempre grátis, pra sempre. Pra ampliar a equipe, os planos saem a partir de R$ 69,90/mês — sem cobrança por lead.",
  },
  {
    icone: "🗂️",
    titulo: "Painel de negócios completo",
    texto:
      "Acompanhe cada negociação do primeiro contato ao registro em cartório, num só painel — sem perder nada no caminho.",
  },
];

type DepoimentoRow = {
  id: string;
  texto: string;
  estrelas: number;
  corretor: { nome: string } | null;
  negocios: { imoveis: { titulo: string; bairro: string } | null } | null;
};

function iniciais(nome: string) {
  return (
    nome
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "??"
  );
}

function renderStars(estrelas: number) {
  const cheias = Math.max(0, Math.min(5, Math.round(estrelas)));
  return "★".repeat(cheias) + "☆".repeat(5 - cheias);
}

export default async function ParaCorretoresPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("depoimentos")
    .select(
      "id, texto, estrelas, corretor:profiles!corretor_id(nome), negocios(imoveis(titulo, bairro))",
    )
    .order("created_at", { ascending: false })
    .limit(3);

  const depoimentos = (data ?? []) as unknown as DepoimentoRow[];

  return (
    <>
      <Nav active="/para-corretores" />

      <header className={styles.hero}>
        <div className="wrap">
          <span className="eyebrow">Para corretores e imobiliárias</span>
          <h1>Feito pra quem vive de fechar negócio.</h1>
          <p className={styles.lead}>
            2 imóveis ativos grátis pra sempre. IA que escreve o anúncio,
            sugestão automática por bairro e selo profissional depois do
            primeiro negócio — tudo num só lugar, sem taxa por lead.
          </p>
          <div className={styles.ctaRow}>
            <Link href="/cadastro-profissional" className="btn btn-primary">
              Criar cadastro profissional →
            </Link>
            <Link href="/entrar" className="btn btn-outline">
              Já tenho conta
            </Link>
          </div>
          <div style={{ marginTop: 36 }}>
            <EstatisticasRede align="start" />
          </div>
        </div>
      </header>

      <section>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Por que corretores escolhem a Rede Impulso</span>
            <h2>O que você ganha ao entrar</h2>
          </div>
          <div className="grid grid-3">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className={`card ${styles.beneficio}`}>
                <span className={styles.beneficioIcone} aria-hidden="true">
                  {b.icone}
                </span>
                <h3 style={{ fontSize: 16, margin: 0 }}>{b.titulo}</h3>
                <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
                  {b.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {depoimentos.length > 0 && (
        <section style={{ background: "var(--surface-2)" }}>
          <div className="wrap">
            <div
              className="flex between items-center"
              style={{ flexWrap: "wrap", gap: 16, marginBottom: 24 }}
            >
              <div>
                <span className="eyebrow">Prova social</span>
                <h2 style={{ fontSize: 24, marginTop: 6 }}>
                  Negócios que já passaram pela Rede
                </h2>
              </div>
              <Link href="/mural-conquistas" className="btn btn-outline btn-sm">
                Ver mural de conquistas →
              </Link>
            </div>
            <div className="grid grid-3">
              {depoimentos.map((d) => {
                const imovel = d.negocios?.imoveis;
                const nome = d.corretor?.nome ?? "Corretor";
                return (
                  <div key={d.id} className={`card ${styles.depoimento}`}>
                    <span className="stars" style={{ fontSize: 13 }}>
                      {renderStars(d.estrelas)}
                    </span>
                    <p className={styles.depoimentoQuote}>&ldquo;{d.texto}&rdquo;</p>
                    <div className={styles.depoimentoWho}>
                      <div className="avatar sm">{iniciais(nome)}</div>
                      <div style={{ fontSize: 12 }}>
                        <strong>{nome}</strong>
                        {imovel && (
                          <div className="muted mono">bairro {imovel.bairro}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section>
        <div className={`card ${styles.ctaFinal} wrap-narrow`}>
          <span className="eyebrow">Pronto pra começar?</span>
          <h2>Crie seu cadastro profissional em poucos minutos</h2>
          <p className="muted" style={{ maxWidth: 46 + "ch", margin: "0 auto 20px" }}>
            Corretor autônomo com CRECI ou imobiliária com CNPJ — os dois
            cabem aqui. Documentos são enviados depois, só pra liberar o
            perfil público.
          </p>
          <Link href="/cadastro-profissional" className="btn btn-primary">
            Criar cadastro profissional →
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
