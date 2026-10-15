import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const metadata = {
  title: "Comece agora | Rede Impulso",
  description:
    "Escolha como você vai usar a Rede Impulso: imobiliária, corretor, construtora/incorporadora ou cliente.",
};

type Opcao = {
  icone: string;
  titulo: string;
  descricao: string;
  href: string;
  cta: string;
};

export default async function ComeceAgoraPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  const logadoComo = (papel: string) => user && role === papel;

  const OPCOES: Opcao[] = [
    {
      icone: "🏢",
      titulo: "Sou dono de imobiliária",
      descricao: "Quero cadastrar minha empresa e gerenciar a equipe de corretores.",
      href: logadoComo("imobiliaria") ? "/painel-negocios" : "/cadastro-profissional?papel=imobiliaria",
      cta: logadoComo("imobiliaria") ? "Ir pro meu painel →" : "Cadastrar minha imobiliária →",
    },
    {
      icone: "🧑‍💼",
      titulo: "Sou corretor autônomo ou de uma imobiliária/construtora",
      descricao: "Trabalho por conta própria ou represento uma empresa — quero publicar imóveis e aparecer em buscas da minha região.",
      href: logadoComo("corretor") ? "/painel-negocios" : "/cadastro-profissional?papel=corretor",
      cta: logadoComo("corretor") ? "Ir pro meu painel →" : "Criar meu cadastro de corretor →",
    },
    {
      icone: "🏗️",
      titulo: "Sou construtora/incorporadora",
      descricao: "Lanço empreendimentos novos — na planta, em construção ou prontos para morar.",
      href: logadoComo("construtora") ? "/painel-negocios" : "/cadastro-profissional?papel=construtora",
      cta: logadoComo("construtora") ? "Ir pro meu painel →" : "Cadastrar minha construtora →",
    },
    {
      icone: "🔑",
      titulo: "Sou cliente",
      descricao: "Quero comprar, alugar ou vender um imóvel.",
      href: user ? "/imoveis" : "/cadastro-cliente",
      cta: user ? "Ver imóveis disponíveis →" : "Criar minha conta grátis →",
    },
  ];

  return (
    <>
      <Nav active="/comece-agora" />

      <header className={styles.hero}>
        <div className="wrap-narrow">
          <span className="eyebrow">Comece agora</span>
          <h1>Como você vai usar a Rede Impulso?</h1>
          <p className={styles.lead}>
            Escolha a opção que melhor te descreve. O cadastro de cliente e os 2
            primeiros imóveis de qualquer corretor ou imobiliária são sempre
            grátis — sem cartão, sem prazo pra acabar.
          </p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <div className="grid grid-2">
            {OPCOES.map((opcao) => (
              <Link key={opcao.titulo} href={opcao.href} className={`card ${styles.papelCard}`}>
                <span className={styles.papelIcone} aria-hidden="true">
                  {opcao.icone}
                </span>
                <span className={styles.papelTitulo}>{opcao.titulo}</span>
                <p className={styles.papelDesc}>{opcao.descricao}</p>
                <span className={styles.papelSeta}>{opcao.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--surface-2)" }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como começar</span>
            <h2>Três passos, sem complicação</h2>
          </div>
          <div className="grid grid-3">
            <div className="card">
              <div style={{ fontSize: 20 }}>1️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Faça seu cadastro</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Escolha a opção acima e informe os dados básicos.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>2️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Complete seu perfil</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                Documentos de verificação liberam a publicação e o perfil público.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>3️⃣</div>
              <strong style={{ fontSize: 14.5 }}>Publique e negocie</strong>
              <p className="hint" style={{ marginBottom: 0 }}>
                2 imóveis ativos sempre grátis — amplie quando precisar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <p className="muted">
            Já é corretor de uma imobiliária ou construtora cadastrada na Rede
            Impulso?{" "}
            <Link href="/cadastro-profissional?papel=corretor" style={{ textDecoration: "underline" }}>
              Crie seu cadastro de corretor
            </Link>{" "}
            normalmente — hoje cada profissional se cadastra com seu próprio
            CRECI, mesmo representando uma empresa.
          </p>
          <p className="muted">
            Dúvidas sobre planos e preços?{" "}
            <Link href="/planos" style={{ textDecoration: "underline" }}>
              Veja o Plano Profissional
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
