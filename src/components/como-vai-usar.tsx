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
      icone: "🧑‍💼",
      titulo: "Sou corretor",
      descricao:
        "Trabalho com imóveis e quero organizar minha agenda — cliente agenda sozinho, e eu também posso cadastrar e agendar na hora.",
      href: logadoComo("corretor") ? "/painel-negocios" : "/cadastro-profissional",
      cta: logadoComo("corretor") ? "Ir pro meu painel →" : "Criar meu cadastro de corretor →",
    },
    {
      icone: "🔑",
      titulo: "Sou cliente",
      descricao: "Quero agendar uma visita com um corretor.",
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
