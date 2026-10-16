import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./como-vai-usar.module.css";

type Opcao = {
  icone: string;
  titulo: string;
  descricao: string;
  href: string;
  cta: string;
};

// Os 4 jeitos de usar a Rede Impulso — mesmo cartão usado em
// /comece-agora e na home. Link muda se a pessoa já está logada com
// aquele papel (vai pro painel em vez de pedir cadastro de novo).
export async function ComoVaiUsar() {
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

  const logadoComo = (papel: string) => Boolean(user && role === papel);

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
      descricao:
        "Trabalho por conta própria ou represento uma empresa — quero publicar imóveis e receber agendamentos de visita direto na minha agenda.",
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
      href: user ? "/area-cliente" : "/cadastro-cliente",
      cta: user ? "Ir para minha área →" : "Criar minha conta grátis →",
    },
  ];

  return (
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
  );
}
