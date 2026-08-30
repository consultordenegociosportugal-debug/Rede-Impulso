"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type NavLink = { href: string; label: string };
type NavItem =
  | { type: "link"; href: string; label: string }
  | { type: "group"; label: string; children: NavLink[] };

const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/", label: "Início" },
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
  { type: "link", href: "/cadastro-cliente", label: "Cadastro cliente" },
  { type: "link", href: "/sobre", label: "Como funciona" },
];

function groupIsActive(item: Extract<NavItem, { type: "group" }>, active: string) {
  return item.children.some((c) => c.href === active);
}

export function Nav({ active }: { active: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function syncUser(currentUser: User | null) {
      setUser(currentUser);
      if (!currentUser) {
        setNome(null);
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("nome, is_admin")
        .eq("id", currentUser.id)
        .single();
      setNome(data?.nome ?? null);
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
        <button
          type="button"
          className="nav-toggle"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
        <div className={open ? "nav-right open" : "nav-right"}>
          <div className="nav-links">
            {NAV_ITEMS.map((item) => {
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
          <div className="nav-auth">
            {user ? (
              <>
                <div className="nav-group" key="conta">
                  <span
                    className={
                      "nav-group-label mono" +
                      (active === "/editar-perfil" || active === "/painel-negocios"
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
                    <Link
                      href="/painel-negocios"
                      className={active === "/painel-negocios" ? "active" : undefined}
                      onClick={() => setOpen(false)}
                    >
                      Minhas negociações
                    </Link>
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
              </>
            ) : (
              <Link
                href="/entrar"
                className="btn btn-outline btn-sm"
                onClick={() => setOpen(false)}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
