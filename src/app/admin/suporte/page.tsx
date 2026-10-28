import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { ResponderForm } from "./responder-form";

type TicketRow = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  assunto: string;
  mensagem: string;
  status: "aberto" | "respondido" | "fechado";
  resposta: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<TicketRow["status"], { label: string; className: string }> = {
  aberto: { label: "Aberto", className: "badge-amber" },
  respondido: { label: "Respondido", className: "badge-primary" },
  fechado: { label: "Fechado", className: "badge-outline" },
};

const formatoData = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AdminSuportePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/suporte");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const filtroStatus = status && ["aberto", "respondido", "fechado"].includes(status) ? status : null;

  let query = supabase
    .from("tickets_suporte")
    .select("id, nome, email, telefone, assunto, mensagem, status, resposta, created_at")
    .order("created_at", { ascending: false });

  if (filtroStatus) query = query.eq("status", filtroStatus);

  const { data } = await query;
  const tickets = (data ?? []) as TicketRow[];

  const abertos = tickets.filter((t) => t.status === "aberto").length;

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Suporte</h1>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar pra administração
          </Link>
        </div>
        <p className="muted mb-16">
          {abertos} chamado{abertos === 1 ? "" : "s"} aberto{abertos === 1 ? "" : "s"}.
        </p>

        <div className="flex gap-8 mb-24" style={{ flexWrap: "wrap" }}>
          <Link
            href="/admin/suporte"
            className={!filtroStatus ? "badge badge-primary" : "badge badge-outline"}
          >
            Todos
          </Link>
          {(["aberto", "respondido", "fechado"] as const).map((s) => (
            <Link
              key={s}
              href={`/admin/suporte?status=${s}`}
              className={filtroStatus === s ? "badge badge-primary" : "badge badge-outline"}
            >
              {STATUS_LABEL[s].label}
            </Link>
          ))}
        </div>

        {tickets.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>Nenhum chamado por aqui.</p>
          </div>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {tickets.map((ticket) => (
              <div key={ticket.id} className="card" style={{ padding: 16 }}>
                <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 14.5 }}>{ticket.assunto}</strong>
                    <span className={`badge ${STATUS_LABEL[ticket.status].className}`} style={{ marginLeft: 8 }}>
                      {STATUS_LABEL[ticket.status].label}
                    </span>
                  </div>
                  <span className="hint" style={{ margin: 0 }}>
                    {formatoData.format(new Date(ticket.created_at))}
                  </span>
                </div>
                <p className="hint" style={{ margin: "4px 0 10px" }}>
                  {ticket.nome} · {ticket.email}
                  {ticket.telefone ? ` · ${ticket.telefone}` : ""}
                </p>
                <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{ticket.mensagem}</p>

                {ticket.resposta && (
                  <div className="card" style={{ background: "var(--surface-2)", marginTop: 8 }}>
                    <p className="hint" style={{ margin: "0 0 4px" }}>Sua resposta:</p>
                    <p style={{ fontSize: 14, margin: 0, whiteSpace: "pre-wrap" }}>{ticket.resposta}</p>
                  </div>
                )}

                {ticket.status !== "fechado" && (
                  <ResponderForm
                    ticketId={ticket.id}
                    respostaAtual={ticket.resposta ?? ""}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
