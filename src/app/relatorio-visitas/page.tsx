import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const PAPEIS_COM_RELATORIO = ["corretor", "imobiliaria", "construtora", "vendedor"];

const STATUS_LABEL: Record<string, string> = {
  solicitada: "Aguardando confirmação",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
};

const STATUS_BADGE: Record<string, string> = {
  solicitada: "badge-amber",
  confirmada: "badge-primary",
  cancelada: "badge-outline",
  realizada: "badge-outline",
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

function dataISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

type VisitaRow = {
  id: string;
  data_hora: string;
  status: string;
  imoveis: { id: string; titulo: string; bairro: string; cidade: string } | null;
  comprador: { nome: string; telefone: string | null } | null;
  corretor: { nome: string } | null;
};

export default async function RelatorioVisitasPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; status?: string; profissional?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=%2Frelatorio-visitas");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "";

  if (!PAPEIS_COM_RELATORIO.includes(role)) {
    return (
      <>
        <Nav active="/relatorio-visitas" />
        <div className="wrap">
          <div className="card" style={{ margin: "48px 0", textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Este relatório é para quem publica imóvel ou atende visita — corretores,
              imobiliárias, construtoras e vendedores.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const ehImobiliaria = role === "imobiliaria";

  let equipe: { profile_id: string; profiles: { nome: string } | null }[] = [];
  let scopeIds = [user.id];
  if (ehImobiliaria) {
    const { data } = await supabase
      .from("corretor_perfis")
      .select("profile_id, profiles!profile_id(nome)")
      .eq("imobiliaria_id", user.id);
    equipe = (data ?? []) as unknown as typeof equipe;
    scopeIds = [user.id, ...equipe.map((c) => c.profile_id)];
  }

  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const inicio = params.inicio || dataISO(trintaDiasAtras);
  const fim = params.fim || dataISO(hoje);
  const statusFiltro = params.status || "";
  const profissionalFiltro = params.profissional || "";

  const idsFiltrados =
    profissionalFiltro && scopeIds.includes(profissionalFiltro) ? [profissionalFiltro] : scopeIds;

  let query = supabase
    .from("visitas")
    .select(
      "id, data_hora, status, imoveis(id, titulo, bairro, cidade), comprador:comprador_id(nome, telefone), corretor:corretor_id(nome)",
    )
    .in("corretor_id", idsFiltrados)
    .gte("data_hora", `${inicio}T00:00:00`)
    .lte("data_hora", `${fim}T23:59:59`)
    .order("data_hora", { ascending: false });

  if (statusFiltro) query = query.eq("status", statusFiltro);

  const { data: dadosVisitas } = await query;
  const visitas = (dadosVisitas ?? []) as unknown as VisitaRow[];

  return (
    <>
      <Nav active="/relatorio-visitas" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">{profile?.nome ?? "Relatório"}</span>
        <h1 style={{ fontSize: 24, margin: "6px 0 16px" }}>Relatório de visitas</h1>

        <form method="get" className="card flex gap-8 items-end" style={{ flexWrap: "wrap", padding: "16px 20px" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="inicio">De</label>
            <input type="date" id="inicio" name="inicio" defaultValue={inicio} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="fim">Até</label>
            <input type="date" id="fim" name="fim" defaultValue={fim} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={statusFiltro}>
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {ehImobiliaria && equipe.length > 0 && (
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="profissional">Profissional</label>
              <select id="profissional" name="profissional" defaultValue={profissionalFiltro}>
                <option value="">Toda a equipe</option>
                {equipe.map((c) => (
                  <option key={c.profile_id} value={c.profile_id}>
                    {c.profiles?.nome ?? "Corretor"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-sm">
            Filtrar
          </button>
        </form>

        <p className="hint mt-16">
          {visitas.length} visita{visitas.length === 1 ? "" : "s"} no período.
        </p>

        {visitas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>Nenhuma visita encontrada com esses filtros.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {visitas.map((v) => (
              <div key={v.id} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 220, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {formatoDataHora.format(new Date(v.data_hora))} ·{" "}
                      {v.imoveis ? (
                        <Link href={`/imoveis/${v.imoveis.id}`}>{v.imoveis.titulo}</Link>
                      ) : (
                        "Imóvel"
                      )}
                    </div>
                    <div className="hint" style={{ margin: 0 }}>
                      Cliente: {v.comprador?.nome ?? "—"}
                      {v.comprador?.telefone ? ` · ${v.comprador.telefone}` : ""}
                      {ehImobiliaria && v.corretor?.nome ? ` · Profissional: ${v.corretor.nome}` : ""}
                    </div>
                  </div>
                  <span className={`badge ${STATUS_BADGE[v.status] ?? "badge-outline"}`}>
                    {STATUS_LABEL[v.status] ?? v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
