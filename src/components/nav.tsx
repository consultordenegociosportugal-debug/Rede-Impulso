"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { MOBILIDADE_ATIVA } from "@/lib/modulos";

type NavLink = { href: string; label: string };
type NavItem =
  | { type: "link"; href: string; label: string }
  | { type: "group"; label: string; children: NavLink[] }
  | { type: "divider" };

// Mobilidade (motorista de aplicativo + elétricos) — adormecida desde
// 2026-10 (ver src/lib/modulos.ts).
const NAV_ITEMS_MOBILIDADE: NavItem[] = [
  {
    type: "group",
    label: "Motorista",
    children: [
      { href: "/motorista", label: "Radar do motorista" },
      { href: "/motorista/raio-x", label: "Raio-X do lucro real" },
      { href: "/motorista/apoio", label: "Mapa de apoio" },
    ],
  },
  {
    type: "group",
    label: "Elétricos",
    children: [
      { href: "/eletricos", label: "Visão geral" },
      { href: "/eletricos/veiculos", label: "Comprar e vender" },
      { href: "/eletricos/eletropostos", label: "Eletropostos" },
      { href: "/eletricos/oficinas", label: "Oficinas especializadas" },
      { href: "/eletricos/comunidade", label: "Comunidade" },
    ],
  },
];

// Núcleo permanente da plataforma desde 2026-10: agendamento entre
// corretor/imobiliária/construtora e cliente.
const NAV_ITEMS_IMOBILIARIO: NavItem[] = [
  { type: "link", href: "/comece-agora", label: "Comece agora" },
  {
    type: "group",
    label: "Imóveis",
    children: [
      { href: "/imoveis", label: "Buscar imóveis" },
      { href: "/publicar-imovel", label: "Publicar imóvel" },
      { href: "/foto-do-imovel", label: "Foto do imóvel" },
      { href: "/favoritos", label: "Favoritos" },
    ],
  },
  {
    type: "group",
    label: "Serviços",
    children: [
      { href: "/servicos", label: "Ver serviços" },
      { href: "/oferecer-servico", label: "Oferecer serviço" },
    ],
  },
  {
    type: "group",
    label: "Profissionais",
    children: [
      { href: "/para-corretores", label: "Para corretores e imobiliárias" },
      { href: "/cadastro-profissional", label: "Cadastro profissional" },
      { href: "/sugestao-corretores", label: "Sugestão de corretores" },
      { href: "/perfil-corretor", label: "Perfil do corretor" },
      { href: "/painel-corretores", label: "Painel de corretores" },
      { href: "/planos", label: "Plano Profissional" },
      { href: "/cursos", label: "Cursos e capacitação" },
      { href: "/meus-cursos", label: "Meus cursos" },
    ],
  },
  {
    type: "group",
    label: "Negócios",
    children: [
      { href: "/painel-negocios", label: "Painel de negócios" },
      { href: "/modelos-contratos", label: "Contratos e documentos" },
      { href: "/mural-conquistas", label: "Mural de conquistas" },
      { href: "/oferta-pos-negocio", label: "Oferta pós-negócio" },
    ],
  },
  { type: "link", href: "/sobre", label: "Como funciona" },
];

// Imóveis é sempre o núcleo. Mobilidade (motorista + elétricos) só aparece
// quando acordada, separada por um divisor visual para não misturar os
// dois mundos. Início sempre abre a lista.
const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/", label: "Início" },
  ...NAV_ITEMS_IMOBILIARIO,
  ...(MOBILIDADE_ATIVA
    ? ([{ type: "divider" }, ...NAV_ITEMS_MOBILIDADE] as NavItem[])
    : []),
  { type: "link", href: "/cadastro-cliente", label: "Cadastro cliente" },
];

// Menu de quem ainda não logou: mesmas 8 abas do site público de
// referência (home / sobre / funções / preços / teste grátis / blog /
// acessar / sou cliente). Quem já está logado usa o menu funcional acima.
const NAV_ITEMS_VISITANTE: NavItem[] = [
  { type: "link", href: "/", label: "Home" },
  { type: "link", href: "/sobre", label: "Sobre" },
  { type: "link", href: "/#funcionalidades", label: "Funções" },
  { type: "link", href: "/planos", label: "Preços" },
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
  { type: "link", href: "/imoveis", label: "Ver imóveis" },
];

function groupIsActive(item: Extract<NavItem, { type: "group" }>, active: string) {
  return item.children.some((c) => c.href === active);
}

export function Nav({ active }: { active: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser(currentUser: User | null) {
      setUser(currentUser);
      if (!currentUser) {
        setNome(null);
        setRole(null);
        setIsAdmin(false);
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
    }

    supabase.auth.getUser().then(({ data }) => syncUser(data.user ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => syncUser(session?.user ?? null),
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

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
                  {nome ?? user.email}
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
                  {MOBILIDADE_ATIVA && (
                    <Link
                      href="/motorista/raio-x"
                      className={active === "/motorista/raio-x" ? "active" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      Meu Raio-X
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
          {(!user ? NAV_ITEMS_VISITANTE : role === "comprador" ? NAV_ITEMS_CLIENTE : NAV_ITEMS).map((item, indice) => {
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
