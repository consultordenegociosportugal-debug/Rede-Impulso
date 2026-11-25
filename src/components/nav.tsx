"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string };
type NavItem =
  | { type: "link"; href: string; label: string }
  | { type: "group"; label: string; children: NavLink[] }
  | { type: "divider" };

// Menu de quem já é corretor logado — só o que ele usa no dia a dia.
// "Comece agora"/"Cadastro profissional"/"Cadastro cliente" eram links de
// cadastro deixados aqui por engano: quem já tem conta via esses links no
// próprio menu, clicava sem perceber que já estava logado, e caía de volta
// na tela de cadastro — foi relatado como "volta pra tela de cadastro".
const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/", label: "Início" },
  {
    type: "group",
    label: "Agendamento",
    children: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/painel-negocios", label: "Minhas visitas" },
      { href: "/painel-negocios/clientes", label: "Meus clientes" },
      { href: "/painel-negocios/leads", label: "Meus leads" },
      { href: "/painel-negocios/disponibilidade", label: "Minha disponibilidade" },
      { href: "/relatorio-visitas", label: "Relatório de visitas" },
    ],
  },
  {
    type: "group",
    label: "Cursos",
    children: [
      { href: "/cursos", label: "Cursos e capacitação" },
      { href: "/meus-cursos", label: "Meus cursos" },
    ],
  },
  { type: "link", href: "/sobre", label: "Como funciona" },
];

// Menu de quem ainda não logou: mesmas 8 abas do site público de
// referência (home / sobre / funções / preços / teste grátis / blog /
// acessar / sou cliente). Quem já está logado usa o menu funcional acima.
const NAV_ITEMS_VISITANTE: NavItem[] = [
  { type: "link", href: "/", label: "Home" },
  { type: "link", href: "/sobre", label: "Sobre" },
  { type: "link", href: "/#funcionalidades", label: "Funções" },
  { type: "link", href: "/comece-agora", label: "Teste grátis" },
  { type: "link", href: "/blog", label: "Blog" },
  { type: "link", href: "/entrar", label: "Acessar" },
  { type: "link", href: "/cadastro-cliente", label: "Sou cliente" },
];

// Menu de quem logou como cliente (comprador) — Início/Buscar/Meus
// agendamentos, igual ao portal do cliente de referência. Quem logou com
// papel profissional continua vendo o menu funcional (NAV_ITEMS).
const NAV_ITEMS_CLIENTE: NavItem[] = [
  { type: "link", href: "/area-cliente", label: "Início" },
  { type: "link", href: "/buscar-profissionais", label: "Buscar" },
  { type: "link", href: "/meus-agendamentos", label: "Meus agendamentos" },
];

// Gestor de uma imobiliária/construtora — só vê as métricas dos seus
// próprios corretores, nunca a agenda operacional (isso é do corretor).
function itensGestor(solicitacoesPendentes: number): NavLink[] {
  return [
    { href: "/painel-gestor", label: "Painel do gestor" },
    { href: "/painel-gestor/leads", label: "Leads" },
    {
      href: "/painel-gestor/solicitacoes",
      label: solicitacoesPendentes > 0 ? `Solicitações (${solicitacoesPendentes})` : "Solicitações",
    },
  ];
}

function navItemsGestor(solicitacoesPendentes: number): NavItem[] {
  return [
    ...itensGestor(solicitacoesPendentes).map((item): NavItem => ({ type: "link", ...item })),
    { type: "link", href: "/editar-perfil", label: "Meu perfil" },
  ];
}

function groupIsActive(item: Extract<NavItem, { type: "group" }>, active: string) {
  return item.children.some((c) => c.href === active);
}

export function Nav({ active }: { active: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Um corretor também pode ter virado gestor (migração 0089, pedido
  // aprovado por outro gestor) sem o `role` principal mudar — por isso
  // isso é checado à parte, não só via `role === "gestor"`.
  const [temPerfilGestor, setTemPerfilGestor] = useState(false);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState(0);
  const [open, setOpen] = useState(false);
  // Até a primeira checagem de sessão resolver, não sabemos se quem
  // está vendo é visitante, cliente ou corretor — sem este guard, o
  // menu nascia assumindo "visitante" e trocava pro menu certo um
  // instante depois, pulando na tela pra quem já estava logado.
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser(currentUser: User | null) {
      setUser(currentUser);
      if (!currentUser) {
        setNome(null);
        setRole(null);
        setIsAdmin(false);
        setTemPerfilGestor(false);
        setSolicitacoesPendentes(0);
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("nome, role, is_admin")
        .eq("id", currentUser.id)
        .single();
      setNome(data?.nome ?? null);
      setRole(data?.role ?? null);
      setIsAdmin(Boolean(data?.is_admin));
      setCarregando(false);

      const { data: gestorPerfil } = await supabase
        .from("gestor_perfis")
        .select("organizacao_catalogo_id")
        .eq("profile_id", currentUser.id)
        .maybeSingle();
      setTemPerfilGestor(Boolean(gestorPerfil));

      if (gestorPerfil) {
        const { count } = await supabase
          .from("solicitacoes_vinculo")
          .select("id", { count: "exact", head: true })
          .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id)
          .eq("status", "pendente");
        setSolicitacoesPendentes(count ?? 0);
      } else {
        setSolicitacoesPendentes(0);
      }
    }

    supabase.auth.getUser().then(({ data }) => syncUser(data.user ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => syncUser(session?.user ?? null),
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // O contador de "Solicitações (N)" é buscado uma vez (acima) e nunca
  // de novo sozinho — router.refresh() na tela de solicitações só
  // atualiza o Server Component da página, não este estado buscado
  // aqui no client. Sem isto, aprovar/recusar uma solicitação deixava
  // o número do menu desatualizado até o próximo reload de página.
  useEffect(() => {
    if (!user) return;
    async function atualizarContagem() {
      const supabase = createClient();
      const { data: gestorPerfil } = await supabase
        .from("gestor_perfis")
        .select("organizacao_catalogo_id")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (!gestorPerfil) return;
      const { count } = await supabase
        .from("solicitacoes_vinculo")
        .select("id", { count: "exact", head: true })
        .eq("organizacao_catalogo_id", gestorPerfil.organizacao_catalogo_id)
        .eq("status", "pendente");
      setSolicitacoesPendentes(count ?? 0);
    }
    window.addEventListener("rede-impulso:solicitacoes-atualizadas", atualizarContagem);
    return () => window.removeEventListener("rede-impulso:solicitacoes-atualizadas", atualizarContagem);
  }, [user]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="nav-left">
          {active !== "/" && (
            <button
              type="button"
              className="nav-back"
              aria-label="Voltar"
              onClick={() => router.back()}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M10 3 5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className="nav-brand">
            <span className="node" />
            Rede Impulso
          </div>
        </div>
        <div className="nav-utility">
          {/* Deslogado usa a aba "Acessar" do menu principal — sem botão
              duplicado aqui. */}
          {user && (
            <div className="nav-auth">
              <div className="nav-group" key="conta">
                <span
                  className={
                    "nav-group-label mono" +
                    (active === "/editar-perfil" ||
                    active === "/painel-negocios" ||
                    active === "/area-cliente"
                      ? " active"
                      : "")
                  }
                  style={{ fontSize: 12 }}
                >
                  <span className="nav-nome-truncado">{nome ?? user.email}</span>
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    aria-hidden="true"
                    className="nav-group-arrow"
                  >
                    <path d="M1 3l3.5 3L8 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="nav-dropdown" style={{ left: "auto", right: 0 }}>
                  {role === "comprador" ? (
                    <Link
                      href="/area-cliente"
                      className={active === "/area-cliente" ? "active" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      Minha área
                    </Link>
                  ) : (
                    <Link
                      href="/painel-negocios"
                      className={active === "/painel-negocios" ? "active" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      Minhas negociações
                    </Link>
                  )}
                  <Link
                    href="/editar-perfil"
                    className={active === "/editar-perfil" ? "active" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    Editar perfil
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-ghost btn-sm"
              >
                Sair
              </button>
            </div>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
          </button>
        </div>
      </div>
      <div className={open ? "nav-panel open" : "nav-panel"}>
        <div className="nav-links">
          {(carregando
            ? []
            : !user
              ? NAV_ITEMS_VISITANTE
              : role === "comprador"
                ? NAV_ITEMS_CLIENTE
                : role === "gestor"
                  ? navItemsGestor(solicitacoesPendentes)
                  : temPerfilGestor
                    ? ([
                        ...NAV_ITEMS,
                        { type: "group", label: "Gestor", children: itensGestor(solicitacoesPendentes) },
                      ] as NavItem[])
                    : NAV_ITEMS
          ).map((item, indice) => {
            if (item.type === "divider") {
              return <div className="nav-divider" key={`divisor-${indice}`} aria-hidden="true" />;
            }
            if (item.type === "link") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={item.href === active ? "active" : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <div className="nav-group" key={item.label}>
                <span
                  className={
                    "nav-group-label" +
                    (groupIsActive(item, active) ? " active" : "")
                  }
                >
                  {item.label}
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    aria-hidden="true"
                    className="nav-group-arrow"
                  >
                    <path d="M1 3l3.5 3L8 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="nav-dropdown">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={child.href === active ? "active" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={active === "/admin" ? "active" : undefined}
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
