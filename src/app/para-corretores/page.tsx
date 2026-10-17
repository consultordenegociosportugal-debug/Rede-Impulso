import Link from "next/link";
import { Nav } from "@/components/nav";
import { EstatisticasRede } from "@/components/estatisticas-rede";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";
import styles from "./page.module.css";

export const metadata = {
  title: "Para corretores | Rede Impulso",
  description:
    "Agenda com disponibilidade real, cadastro de cliente sem login, lembrete automático por e-mail e selo profissional depois do 1º negócio.",
};

const BENEFICIOS = [
  {
    icone: "🗓️",
    titulo: "Disponibilidade real, sem ida e volta",
    texto:
      "Configure os dias e horários em que atende uma vez só. Cliente só vê o que está livre — a visita já nasce confirmada.",
  },
  {
    icone: "🙋",
    titulo: "Cadastre o cliente e agende na hora",
    texto:
      "Cliente de balcão não precisa criar conta nem senha — você cadastra nome e telefone e já sai com o horário marcado.",
  },
  {
    icone: "🔔",
    titulo: "Lembrete automático por e-mail",
    texto:
      "Um aviso chega pro cliente e pra você antes de cada visita confirmada — ninguém esquece, ninguém fica esperando à toa.",
  },
  {
    icone: "📅",
    titulo: "Sincronização com Google Agenda",
    texto:
      "Conecte sua conta e cada visita confirmada vira um evento automático — sem copiar nada manualmente.",
  },
  {
    icone: "📊",
    titulo: "Relatório de visitas",
    texto:
      "Filtre por período e status e acompanhe tudo o que já foi agendado, confirmado ou realizado.",
  },
  {
    icone: "🏅",
    titulo: "Selo profissional",
    texto:
      "Seu perfil ganha selo de avaliação depois do primeiro negócio fechado, e se destaca pra quem está decidindo em quem confiar.",
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
          <span className="eyebrow">Para corretores</span>
          <h1>Feito pra quem vive de visita e negócio fechado.</h1>
          <p className={styles.lead}>
            Configure sua disponibilidade, receba agendamentos confirmados e cadastre
            clientes de balcão sem login — tudo sempre grátis, sem taxa por lead.
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
            Corretor autônomo com CRECI — o documento é enviado depois, só pra
            liberar o perfil público.
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
