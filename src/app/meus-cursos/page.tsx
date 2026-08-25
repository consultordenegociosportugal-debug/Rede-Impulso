import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pendente_pagamento: { label: "Pagamento pendente", className: "badge-amber" },
  pago: { label: "Pago", className: "badge-primary" },
  concluido: { label: "Concluído", className: "badge-primary" },
  cancelado: { label: "Cancelado", className: "badge-outline" },
};

type MatriculaRow = {
  id: string;
  status: string;
  valor: number;
  created_at: string;
  cursos: { id: string; titulo: string; carga_horaria: number | null } | null;
};

export default async function MeusCursosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/meus-cursos");
  }

  const { data } = await supabase
    .from("matriculas")
    .select("id, status, valor, created_at, cursos(id, titulo, carga_horaria)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  const matriculas = (data ?? []) as unknown as MatriculaRow[];

  return (
    <>
      <Nav active="/meus-cursos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Rede educacional</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Meus cursos</h1>
        <p className="muted mb-24">Cursos em que você demonstrou interesse ou já está matriculado.</p>

        {matriculas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Você ainda não se matriculou em nenhum curso.
            </p>
            <Link href="/cursos" className="btn btn-primary btn-sm mt-16">
              Ver cursos disponíveis
            </Link>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {matriculas.map((m) => {
              const badge = STATUS_BADGE[m.status] ?? { label: m.status, className: "badge-outline" };
              return (
                <div key={m.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {m.cursos?.titulo ?? "Curso"}
                    </div>
                    <div className="hint" style={{ margin: 0 }}>
                      {m.cursos?.carga_horaria ? `${m.cursos.carga_horaria}h · ` : ""}
                      {formatoMoeda.format(m.valor)}
                    </div>
                  </div>
                  <span className={`badge ${badge.className}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
