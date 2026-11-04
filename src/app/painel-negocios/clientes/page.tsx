import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { NovoClienteForm } from "./novo-cliente-form";

const PAPEIS_COM_CLIENTES = ["corretor"];

type ClienteRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  imovel_interesse: string | null;
  created_at: string;
};

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function ClientesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-negocios/clientes");
  }

  // Cadastrar cliente avulso e agendar é operação de corretor — sem
  // isso, qualquer comprador autenticado conseguia usar este formulário
  // e se auto-agendar como se fosse corretor (ver migração de RLS que
  // fecha o mesmo buraco no banco).
  const { data: perfilUsuario } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!PAPEIS_COM_CLIENTES.includes(perfilUsuario?.role ?? "")) {
    return (
      <>
        <Nav active="/painel-negocios" />
        <div className="wrap">
          <div className="card" style={{ margin: "48px 0", textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Esta página é para quem atende visitas — corretores.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { data: clientesData } = await supabase
    .from("clientes_avulsos")
    .select("id, nome, telefone, email, cidade, imovel_interesse, created_at")
    .eq("corretor_id", user.id)
    .order("created_at", { ascending: false });

  const clientes = (clientesData ?? []) as ClienteRow[];

  const { data: proximasVisitasData } = await supabase
    .from("visitas")
    .select("id, data_hora, status, cliente_avulso_id")
    .eq("corretor_id", user.id)
    .not("cliente_avulso_id", "is", null)
    .neq("status", "cancelada")
    .gte("data_hora", new Date().toISOString())
    .order("data_hora", { ascending: true });

  const proximaVisitaPorCliente = new Map<
    string,
    { data_hora: string; status: string }
  >();
  for (const visita of proximasVisitasData ?? []) {
    if (visita.cliente_avulso_id && !proximaVisitaPorCliente.has(visita.cliente_avulso_id)) {
      proximaVisitaPorCliente.set(visita.cliente_avulso_id, {
        data_hora: visita.data_hora,
        status: visita.status,
      });
    }
  }

  return (
    <>
      <Nav active="/painel-negocios" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/painel-negocios" className="hint">
          ← Voltar para o painel
        </Link>

        <span className="eyebrow">Agendamento</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Meus clientes</h1>
        <p className="muted mb-16">
          Cadastre um cliente na hora — sem ele precisar criar conta nenhuma — e já
          saia com o horário marcado.
        </p>

        <NovoClienteForm />

        <h2 style={{ fontSize: 18, margin: "32px 0 12px" }}>
          Clientes cadastrados{clientes.length > 0 ? ` (${clientes.length})` : ""}
        </h2>

        {clientes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Você ainda não cadastrou nenhum cliente.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {clientes.map((cliente) => {
              const proxima = proximaVisitaPorCliente.get(cliente.id);
              return (
                <div key={cliente.id} className="list-row">
                  <div
                    className="flex between items-center"
                    style={{ width: "100%", gap: 12, flexWrap: "wrap" }}
                  >
                    <div style={{ minWidth: 200, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{cliente.nome}</div>
                      <div className="hint" style={{ margin: 0 }}>
                        {cliente.telefone ?? "sem telefone"}
                        {cliente.email ? ` · ${cliente.email}` : ""}
                        {cliente.cidade ? ` · ${cliente.cidade}` : ""}
                      </div>
                      {cliente.imovel_interesse && (
                        <div className="hint" style={{ margin: 0 }}>
                          Interesse: {cliente.imovel_interesse}
                        </div>
                      )}
                    </div>
                    {proxima ? (
                      <span className="badge badge-primary">
                        {formatoDataHora.format(new Date(proxima.data_hora))}
                      </span>
                    ) : (
                      <span className="badge badge-outline">sem visita futura</span>
                    )}
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
