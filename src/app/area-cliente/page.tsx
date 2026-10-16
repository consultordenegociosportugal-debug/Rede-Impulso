import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

type VisitaRow = {
  id: string;
  data_hora: string;
  status: string;
  imoveis: { id: string; titulo: string; bairro: string } | null;
};

export default async function AreaClientePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=%2Farea-cliente");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", user.id)
    .single();

  const { data: dadosVisitas } = await supabase
    .from("visitas")
    .select("id, data_hora, status, imoveis(id, titulo, bairro)")
    .eq("comprador_id", user.id)
    .gte("data_hora", new Date().toISOString())
    .order("data_hora", { ascending: true })
    .limit(3);
  const proximasVisitas = (dadosVisitas ?? []) as unknown as VisitaRow[];

  const primeiroNome = (profile?.nome ?? "").trim().split(" ")[0] || "você";

  return (
    <>
      <Nav active="/area-cliente" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Sua área</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Olá, {primeiroNome}</h1>
        <p className="muted">O que você procura hoje?</p>

        <div className="grid grid-2 mt-24">
          <Link href="/buscar-profissionais" className="card">
            <strong style={{ fontSize: 16 }}>🔎 Buscar um profissional</strong>
            <p className="hint" style={{ marginBottom: 0 }}>
              Por nome, por cidade ou perto de você.
            </p>
          </Link>
          <Link href="/imoveis" className="card">
            <strong style={{ fontSize: 16 }}>🏠 Ver imóveis disponíveis</strong>
            <p className="hint" style={{ marginBottom: 0 }}>Comprar, alugar ou vender.</p>
          </Link>
        </div>

        <section className="mt-24">
          <div className="flex between items-center mb-12">
            <h2 style={{ fontSize: 18, margin: 0 }}>Seus próximos agendamentos</h2>
            <Link href="/meus-agendamentos" className="btn btn-ghost btn-sm">
              Ver todos →
            </Link>
          </div>
          {proximasVisitas.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
              <p className="muted" style={{ margin: 0 }}>
                Você ainda não tem nenhuma visita agendada.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: "8px 20px" }}>
              {proximasVisitas.map((v) => (
                <div key={v.id} className="list-row">
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {formatoDataHora.format(new Date(v.data_hora))}
                  </div>
                  <div className="hint" style={{ margin: 0 }}>
                    {v.imoveis ? v.imoveis.titulo : "Imóvel"}
                    {v.imoveis?.bairro ? ` · ${v.imoveis.bairro}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </>
  );
}
