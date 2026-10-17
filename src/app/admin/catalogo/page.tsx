import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { NovaCidadeForm } from "./nova-cidade-form";
import { NovaOrganizacaoForm } from "./nova-organizacao-form";
import { ExcluirCatalogoButton } from "./excluir-catalogo-button";

type CidadeRow = { id: string; nome: string; uf: string };
type OrganizacaoRow = {
  id: string;
  nome: string;
  tipo: "imobiliaria" | "construtora";
  cnpj: string | null;
  cidade: { nome: string; uf: string } | null;
};

const LABEL_TIPO: Record<OrganizacaoRow["tipo"], string> = {
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
};

export default async function AdminCatalogoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/catalogo");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const [{ data: cidadesData }, { data: organizacoesData }] = await Promise.all([
    supabase.from("cidades_catalogo").select("id, nome, uf").order("nome", { ascending: true }),
    supabase
      .from("organizacoes_catalogo")
      .select("id, nome, tipo, cnpj, cidade:cidade_id(nome, uf)")
      .order("nome", { ascending: true }),
  ]);

  const cidades = (cidadesData ?? []) as CidadeRow[];
  const organizacoes = (organizacoesData ?? []) as unknown as OrganizacaoRow[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Catálogo de cidades e organizações
            </h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Imobiliárias e construtoras cadastradas aqui são só etiquetas de
              referência — não têm login próprio. O corretor se vincula direto a
              uma delas, no próprio perfil.
            </p>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar pra administração
          </Link>
        </div>

        <div className="grid grid-2 mt-24" style={{ gap: 24, alignItems: "start" }}>
          <section>
            <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>
              Cidades{cidades.length > 0 ? ` (${cidades.length})` : ""}
            </h2>
            <NovaCidadeForm />
            {cidades.length === 0 ? (
              <div className="card mt-16" style={{ textAlign: "center", padding: "24px 16px" }}>
                <p className="muted" style={{ margin: 0 }}>Nenhuma cidade cadastrada ainda.</p>
              </div>
            ) : (
              <div className="card mt-16" style={{ padding: "8px 16px" }}>
                {cidades.map((cidade) => (
                  <div key={cidade.id} className="list-row">
                    <div className="flex between items-center" style={{ width: "100%" }}>
                      <span style={{ fontSize: 14 }}>
                        {cidade.nome}/{cidade.uf}
                      </span>
                      <ExcluirCatalogoButton tabela="cidades_catalogo" id={cidade.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>
              Imobiliárias e construtoras
              {organizacoes.length > 0 ? ` (${organizacoes.length})` : ""}
            </h2>
            <NovaOrganizacaoForm cidades={cidades} />
            {organizacoes.length === 0 ? (
              <div className="card mt-16" style={{ textAlign: "center", padding: "24px 16px" }}>
                <p className="muted" style={{ margin: 0 }}>
                  Nenhuma imobiliária/construtora cadastrada ainda.
                </p>
              </div>
            ) : (
              <div className="card mt-16" style={{ padding: "8px 16px" }}>
                {organizacoes.map((org) => (
                  <div key={org.id} className="list-row">
                    <div className="flex between items-center" style={{ width: "100%", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{org.nome}</div>
                        <div className="hint" style={{ margin: 0 }}>
                          {LABEL_TIPO[org.tipo]}
                          {org.cidade ? ` · ${org.cidade.nome}/${org.cidade.uf}` : ""}
                          {org.cnpj ? ` · ${org.cnpj}` : ""}
                        </div>
                      </div>
                      <ExcluirCatalogoButton tabela="organizacoes_catalogo" id={org.id} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
}
