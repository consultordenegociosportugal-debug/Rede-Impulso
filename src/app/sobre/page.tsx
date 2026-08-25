import Link from "next/link";
import type { CSSProperties } from "react";
import { Nav } from "@/components/nav";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const NETWORK_NODES = [
  { label: "Vendedor", initials: "V", bg: "var(--primary-tint)", color: "var(--primary-dark)", size: "" },
  { label: "Corretor", initials: "C", bg: "var(--amber-tint)", color: "var(--amber)", size: "sm" },
  { label: "Imobiliária", initials: "I", bg: "var(--primary-tint)", color: "var(--primary-dark)", size: "sm" },
  { label: "Cartório", initials: "Ct", bg: "var(--coral-tint)", color: "var(--coral)", size: "sm" },
  { label: "Comprador", initials: "Cp", bg: "var(--primary-tint)", color: "var(--primary-dark)", size: "" },
];

const MOVIMENTOS = [
  {
    passo: "01 · o cliente busca",
    titulo: "Cliente quer comprar, vender ou alugar",
    detalhe:
      "Ele conta o que precisa e a Rede Impulso direciona para o corretor ou imobiliária certo pra atender.",
  },
  {
    passo: "02 · corretor e imobiliária atendem",
    titulo: "A ponta certa entra em ação",
    detalhe:
      "Corretor e imobiliária recebem a conexão já qualificada e conduzem a negociação com o cliente.",
  },
  {
    passo: "03 · negócio fechado",
    titulo: "Fechou, a rede recebe comissão",
    detalhe:
      "Sem negócio, sem cobrança. A comissão só é gerada quando o negócio é concluído de fato.",
  },
];

const STEPS = [
  { title: "Anúncio do imóvel", detail: "vendedor publica na vitrine" },
  { title: "Sugestão de corretores", detail: "ranking por bairro e sucesso" },
  { title: "Contato e negociação", detail: "comprador, corretor e imobiliária" },
  { title: "Fechamento do negócio", detail: "acordo confirmado" },
  { title: "Escolha do cartório", detail: "indicado por qualquer uma das partes" },
  { title: "Documentos e escritura", detail: "cartório processa o registro" },
  { title: "Conclusão do negócio", detail: "registro confirmado" },
  { title: "Mural e ofertas pós-negócio", detail: "depoimentos e novos serviços" },
];

export default function SobrePage() {
  return (
    <>
      <Nav active="/sobre" />

      <header className={styles.hero}>
        <div className={`wrap ${styles.heroGrid}`}>
          <div>
            <span className="eyebrow">Rede de negócios imobiliários</span>
            <h1>
              Um sistema só,
              <br />
              cinco pontas conectadas.
            </h1>
            <p className={styles.lead}>
              Para quem compra e vende, a Rede Impulso é uma vitrine simples —
              como um classificado. Para corretores, imobiliárias e
              cartórios, é o sistema operacional do negócio inteiro, do
              primeiro contato ao registro em cartório.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/cadastro-cliente" className="btn btn-primary">
                Sou cliente
              </Link>
              <Link href="/cadastro-profissional" className="btn btn-outline">
                Sou profissional
              </Link>
            </div>
          </div>

          <div className={styles.networkPanel}>
            <div className={styles.networkRow}>
              {NETWORK_NODES.map((node, i) => (
                <div key={node.label} className={styles.networkNodeWrap}>
                  {i > 0 && (
                    <div
                      className={styles.networkLine}
                      style={{ "--pulse-delay": `${i * 0.5}s` } as CSSProperties}
                    />
                  )}
                  <div className={styles.networkNode}>
                    <div
                      className={`avatar ${node.size}`}
                      style={{
                        background: node.bg,
                        color: node.color,
                        "--pulse-delay": `${i * 0.5}s`,
                      } as CSSProperties}
                    >
                      {node.initials}
                    </div>
                    <div className={styles.lbl}>{node.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="hint" style={{ textAlign: "center", marginTop: 18 }}>
              Cada negócio percorre essa linha — do anúncio ao registro.
            </p>
          </div>
        </div>
      </header>

      <section>
        <div className="wrap-narrow">
          <div className={styles.sectionHead}>
            <span className="eyebrow">O que importa pra nós</span>
            <h2>Da conexão ao negócio fechado, em três movimentos.</h2>
            <p className="muted">
              A rede existe para gerar encontros que viram negócio — sem taxa
              fixa, sem letra miúda. Os demais serviços são uma consequência
              oportuna, não o ponto.
            </p>
          </div>
          <div className="grid grid-3">
            {MOVIMENTOS.map((m) => (
              <div key={m.titulo} className="card">
                <span className="eyebrow mono">{m.passo}</span>
                <h3 style={{ fontSize: 17, marginTop: 10 }}>{m.titulo}</h3>
                <p className="muted" style={{ fontSize: 13.5 }}>{m.detalhe}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Para clientes</span>
            <h2>Simples como anunciar, seguro como fechar negócio</h2>
          </div>
          <div className="grid grid-2">
            <div className="card">
              <span className="badge badge-primary">Vendedor</span>
              <h3 style={{ marginTop: 12, fontSize: 19 }}>
                Publique e receba corretores até você
              </h3>
              <p className="muted">
                Anuncie o imóvel e veja os melhores corretores da sua região
                virem até você — ou publique sem vincular ninguém, se
                preferir.
              </p>
              <Link
                href="/publicar-imovel"
                className="btn btn-ghost btn-sm mt-12"
              >
                Publicar meu imóvel →
              </Link>
            </div>
            <div className="card">
              <span className="badge badge-amber">Comprador</span>
              <h3 style={{ marginTop: 12, fontSize: 19 }}>
                Negocie direto, sem letra miúda
              </h3>
              <p className="muted">
                Fale com o corretor responsável, acompanhe o negócio até o
                cartório e receba ofertas de serviços quando a chave estiver
                na mão.
              </p>
              <Link href="/imoveis" className="btn btn-ghost btn-sm mt-12">
                Ver imóveis disponíveis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Para quem trabalha no mercado</span>
            <h2>O sistema operacional da sua carteira</h2>
          </div>
          <div className="grid grid-3">
            <div className={`card ${styles.pillarCard}`}>
              <span className="badge badge-outline">Corretor autônomo</span>
              <h3 style={{ fontSize: 17 }}>Sua carteira, seu ranking</h3>
              <ul>
                <li>Leads por bairro de atuação</li>
                <li>Estrelas de carreira e depoimentos</li>
                <li>Negócios do início ao registro</li>
              </ul>
            </div>
            <div className={`card ${styles.pillarCard}`}>
              <span className="badge badge-outline">Imobiliária</span>
              <h3 style={{ fontSize: 17 }}>Gestão de toda a equipe</h3>
              <ul>
                <li>Ranking e metas por corretor</li>
                <li>Distribuição de leads e negócios</li>
                <li>Permissões e controle de acesso</li>
              </ul>
              <Link
                href="/painel-corretores"
                className="btn btn-ghost btn-sm mt-8"
              >
                Ver painel de corretores →
              </Link>
            </div>
            <div className={`card ${styles.pillarCard}`}>
              <span className="badge badge-outline">Cartório</span>
              <h3 style={{ fontSize: 17 }}>Só os processos que importam</h3>
              <ul>
                <li>Fila de processos vindos da Rede Impulso</li>
                <li>Documentos do negócio centralizados</li>
                <li>Status por etapa, sem ruído externo</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow">
          <div className={styles.sectionHead}>
            <span className="eyebrow">Passo a passo completo</span>
            <h2>Da publicação ao registro</h2>
          </div>
          <div className={styles.steps}>
            {STEPS.map((step) => (
              <div key={step.title} className={styles.stepItem}>
                <div className={styles.stepNum} />
                <div>
                  <strong>{step.title}</strong>
                  <p className="muted mono" style={{ margin: "2px 0 0" }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div
            className="flex between items-center"
            style={{ flexWrap: "wrap", gap: 16 }}
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
        </div>
      </section>

      <Footer />
    </>
  );
}
