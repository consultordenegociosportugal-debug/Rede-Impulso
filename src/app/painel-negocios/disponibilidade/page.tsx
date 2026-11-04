import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { DisponibilidadeForm, type JanelaExistente } from "./form";

const PAPEIS_COM_DISPONIBILIDADE = ["corretor"];

export default async function DisponibilidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-negocios/disponibilidade");
  }

  // Configurar disponibilidade é operação de corretor — sem isso,
  // qualquer comprador autenticado conseguia marcar horários pra si
  // mesmo e depois se auto-agendar como se fosse corretor (ver
  // migração de RLS que fecha o mesmo buraco no banco).
  const { data: perfilUsuario } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!PAPEIS_COM_DISPONIBILIDADE.includes(perfilUsuario?.role ?? "")) {
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

  const { data } = await supabase
    .from("disponibilidade_semanal")
    .select("dia_semana, hora_inicio, hora_fim")
    .eq("profile_id", user.id);

  const janelas = (data ?? []) as JanelaExistente[];

  return (
    <>
      <Nav active="/painel-negocios" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <Link href="/painel-negocios" className="hint">
          ← Voltar para meus negócios
        </Link>

        <span className="eyebrow">Agendamento</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Minha disponibilidade</h1>
        <p className="muted mb-16">
          Marque os dias e horários em que você atende visitas. Quem agendar
          com você vê só os horários livres e já sai com a visita confirmada
          — sem você precisar confirmar manualmente.
        </p>

        <DisponibilidadeForm janelasExistentes={janelas} />
      </div>

      <Footer />
    </>
  );
}
