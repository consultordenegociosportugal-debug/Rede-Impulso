import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CopiarLinkConviteBotao } from "./copiar-link-convite-botao";

type OrganizacaoRow = {
  id: string;
  nome: string;
  tipo: "imobiliaria" | "construtora";
  email_gestor: string | null;
  cidade: { nome: string; uf: string } | null;
};

const LABEL_TIPO: Record<OrganizacaoRow["tipo"], string> = {
  imobiliaria: "Imobiliária",
  construtora: "Construtora",
};

// Lista de alvo pra "expandir de dentro pra fora": organizações do
// catálogo que já têm corretor de verdade usando o sistema (vínculo
// aprovado, migração 0089), mas nenhum gestor assumiu o painel ainda.
// É a prova social pronta pro convite — "N corretores da sua equipe já
// usam a Rede Impulso" é bem mais forte que uma pitch fria.
export default async function AdminOportunidadesGestorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/oportunidades-gestor");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  // Service role pra esse relatório: visitas não tem policy de leitura
  // pra admin (só corretor dono, interessado, ou gestor da organização
  // — migrações 0020/0048/0056/0057) — sem isso, a contagem de
  // agendamentos sempre vinha zerada, mesmo com visitas de verdade.
  const admin = createAdminClient();
  if (!admin) {
    redirect("/admin");
  }

  const [{ data: organizacoesData }, { data: corretoresData }, { data: gestoresData }] =
    await Promise.all([
      admin
        .from("organizacoes_catalogo")
        .select("id, nome, tipo, email_gestor, cidade:cidade_id(nome, uf)")
        .order("nome", { ascending: true }),
      admin
        .from("corretor_perfis")
        .select("profile_id, organizacao_catalogo_id")
        .not("organizacao_catalogo_id", "is", null),
      admin.from("gestor_perfis").select("organizacao_catalogo_id"),
    ]);

  const organizacoes = (organizacoesData ?? []) as unknown as OrganizacaoRow[];
  const corretores = (corretoresData ?? []) as { profile_id: string; organizacao_catalogo_id: string }[];
  const orgsComGestor = new Set((gestoresData ?? []).map((g) => g.organizacao_catalogo_id));

  const corretorIds = corretores.map((c) => c.profile_id);
  const { data: visitasData } =
    corretorIds.length > 0
      ? await admin.from("visitas").select("corretor_id").in("corretor_id", corretorIds)
      : { data: [] };

  const visitasPorCorretor = new Map<string, number>();
  for (const v of visitasData ?? []) {
    visitasPorCorretor.set(v.corretor_id, (visitasPorCorretor.get(v.corretor_id) ?? 0) + 1);
  }

  const corretoresPorOrg = new Map<string, number>();
  const visitasPorOrg = new Map<string, number>();
  for (const c of corretores) {
    corretoresPorOrg.set(
      c.organizacao_catalogo_id,
      (corretoresPorOrg.get(c.organizacao_catalogo_id) ?? 0) + 1,
    );
    visitasPorOrg.set(
      c.organizacao_catalogo_id,
      (visitasPorOrg.get(c.organizacao_catalogo_id) ?? 0) + (visitasPorCorretor.get(c.profile_id) ?? 0),
    );
  }

  const oportunidades = organizacoes
    .map((org) => ({
      org,
      corretores: corretoresPorOrg.get(org.id) ?? 0,
      visitas: visitasPorOrg.get(org.id) ?? 0,
    }))
    .filter((o) => o.corretores > 0 && !orgsComGestor.has(o.org.id))
    .sort((a, b) => b.corretores - a.corretores);

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Oportunidades de gestor{oportunidades.length > 0 ? ` (${oportunidades.length})` : ""}
            </h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Organizações com corretor de verdade usando a Rede Impulso, mas sem nenhum gestor
              no painel ainda — a lista de quem abordar primeiro. Copie o link de convite: ele já
              chega com a organização e a prova social pré-preenchidas.
            </p>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar pra administração
          </Link>
        </div>

        {oportunidades.length === 0 ? (
          <div className="card mt-24" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma oportunidade agora — ou toda organização com corretor ativo já tem gestor,
              ou nenhum corretor está vinculado a uma organização ainda.
            </p>
          </div>
        ) : (
          <div className="card mt-24" style={{ padding: "8px 20px" }}>
            {oportunidades.map(({ org, corretores: totalCorretores, visitas }) => (
              <div key={org.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{org.nome}</div>
                  <div className="hint" style={{ margin: 0 }}>
                    {LABEL_TIPO[org.tipo]}
                    {org.cidade ? ` · ${org.cidade.nome}/${org.cidade.uf}` : ""}
                    {org.email_gestor ? ` · ${org.email_gestor}` : ""}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 12, textAlign: "right", minWidth: 140 }}>
                  <div>
                    {totalCorretores} corretor{totalCorretores === 1 ? "" : "es"} vinculado
                    {totalCorretores === 1 ? "" : "s"}
                  </div>
                  <div className="muted">
                    {visitas} agendamento{visitas === 1 ? "" : "s"} no total
                  </div>
                </div>
                <CopiarLinkConviteBotao organizacaoId={org.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
