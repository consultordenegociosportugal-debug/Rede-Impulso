import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsapp } from "@/lib/telefone";
import { VisitaClienteAcoes } from "./visita-cliente-acoes";

const STATUS_VISITA: Record<string, { label: string; className: string }> = {
  solicitada: { label: "Aguardando confirmação", className: "badge-amber" },
  confirmada: { label: "Confirmada", className: "badge-primary" },
  cancelada: { label: "Cancelada", className: "badge-outline" },
  realizada: { label: "Realizada", className: "badge-primary" },
  nao_compareceu: { label: "Você não compareceu", className: "badge-coral" },
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type VisitaRow = {
  id: string;
  data_hora: string;
  status: string;
  corretor_id: string;
  corretor: { nome: string; telefone: string | null } | null;
};

function ListaVisitas({
  visitas,
  vazio,
  comAcoes,
}: {
  visitas: VisitaRow[];
  vazio: string;
  comAcoes?: boolean;
}) {
  if (visitas.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
        <p className="muted" style={{ margin: 0 }}>{vazio}</p>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: "8px 20px" }}>
      {visitas.map((v) => {
        const badge = STATUS_VISITA[v.status] ?? { label: v.status, className: "badge-outline" };
        // Só faz sentido oferecer o contato direto enquanto a visita ainda
        // está de pé — depois de cancelada o cliente já tem o botão de
        // agendar outro horário, que resolve melhor que uma ligação.
        const podeFalarDireto =
          (v.status === "solicitada" || v.status === "confirmada") && v.corretor?.telefone;
        const link = podeFalarDireto ? linkWhatsapp(v.corretor!.telefone!) : null;
        return (
          <div key={v.id} className="list-row">
            <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 220, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {formatoDataHora.format(new Date(v.data_hora))}
                </div>
                <div className="hint" style={{ margin: 0 }}>
                  Com {v.corretor?.nome ?? "o corretor"}
                </div>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hint"
                    style={{ textDecoration: "underline" }}
                  >
                    💬 Falar com {v.corretor?.nome ?? "o corretor"} no WhatsApp
                  </a>
                )}
              </div>
              <div className="flex gap-8 items-center">
                <span className={`badge ${badge.className}`}>{badge.label}</span>
                {comAcoes && (
                  <VisitaClienteAcoes
                    visitaId={v.id}
                    status={v.status}
                    dataHora={v.data_hora}
                    corretorId={v.corretor_id}
                    corretorNome={v.corretor?.nome ?? "o corretor"}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function MeusAgendamentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=%2Fmeus-agendamentos");
  }

  const agora = new Date().toISOString();

  const { data: dadosFuturas } = await supabase
    .from("visitas")
    .select("id, data_hora, status, corretor_id, corretor:corretor_id(nome, telefone)")
    .eq("comprador_id", user.id)
    .gte("data_hora", agora)
    .order("data_hora", { ascending: true });
  const futuras = (dadosFuturas ?? []) as unknown as VisitaRow[];

  const { data: dadosPassadas } = await supabase
    .from("visitas")
    .select("id, data_hora, status, corretor_id, corretor:corretor_id(nome, telefone)")
    .eq("comprador_id", user.id)
    .lt("data_hora", agora)
    .order("data_hora", { ascending: false })
    .limit(20);
  const passadas = (dadosPassadas ?? []) as unknown as VisitaRow[];

  return (
    <>
      <Nav active="/meus-agendamentos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Sua conta</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Meus agendamentos</h1>
        <p className="muted">Suas visitas agendadas com um corretor.</p>

        <section className="mt-24">
          <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Próximas</h2>
          <ListaVisitas visitas={futuras} vazio="Você não tem nenhuma visita agendada." comAcoes />
          {futuras.length === 0 && (
            <div className="flex gap-8 mt-16" style={{ flexWrap: "wrap" }}>
              <Link href="/buscar-profissionais" className="btn btn-primary btn-sm">
                Buscar um profissional →
              </Link>
            </div>
          )}
        </section>

        {passadas.length > 0 && (
          <section className="mt-24">
            <h2 style={{ fontSize: 18, margin: "0 0 12px" }}>Anteriores</h2>
            <ListaVisitas visitas={passadas} vazio="Nenhuma visita anterior." />
          </section>
        )}
      </div>

      <Footer />
    </>
  );
}
