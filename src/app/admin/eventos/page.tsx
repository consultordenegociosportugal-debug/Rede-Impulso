import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
};

type EventoRow = {
  id: string;
  status_anterior: string | null;
  status_novo: string;
  data_hora_visita: string | null;
  motivo: string | null;
  criado_em: string;
  corretor: { nome: string } | null;
  visitas: {
    comprador: { nome: string } | null;
    cliente_avulso: { nome: string } | null;
  } | null;
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function rotulo(status: string) {
  return STATUS_LABEL[status] ?? status;
}

export default async function AdminEventosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/eventos");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const { data } = await supabase
    .from("visitas_eventos")
    .select(
      "id, status_anterior, status_novo, data_hora_visita, motivo, criado_em, corretor:corretor_id(nome), visitas:visita_id(comprador:comprador_id(nome), cliente_avulso:cliente_avulso_id(nome))",
    )
    .order("criado_em", { ascending: false })
    .limit(300);

  const eventos = (data ?? []) as unknown as EventoRow[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Linha do tempo de visitas</h1>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar
          </Link>
        </div>
        <p className="muted mb-24">
          Toda visita criada ou que trocou de status aparece aqui — gravado automaticamente,
          não depende de nenhuma tela lembrar de registrar. Mostrando os {eventos.length} eventos
          mais recentes.
        </p>

        {eventos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum evento registrado ainda.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {eventos.map((evento) => {
              const cliente = evento.visitas?.comprador?.nome ?? evento.visitas?.cliente_avulso?.nome ?? null;
              return (
                <div key={evento.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                      {evento.status_anterior ? (
                        <>
                          {rotulo(evento.status_anterior)} → {rotulo(evento.status_novo)}
                        </>
                      ) : (
                        <>Criada como {rotulo(evento.status_novo)}</>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {evento.corretor?.nome ?? "corretor excluído"}
                      {cliente ? ` · cliente: ${cliente}` : ""}
                      {evento.data_hora_visita
                        ? ` · visita em ${formatoDataHora.format(new Date(evento.data_hora_visita))}`
                        : ""}
                    </div>
                    {evento.motivo && (
                      <div className="hint" style={{ marginTop: 4 }}>
                        {evento.motivo}
                      </div>
                    )}
                  </div>
                  <div className="muted mono" style={{ fontSize: 12 }}>
                    {formatoDataHora.format(new Date(evento.criado_em))}
                  </div>
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
