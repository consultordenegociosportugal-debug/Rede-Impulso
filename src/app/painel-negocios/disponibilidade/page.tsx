import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { DisponibilidadeForm, type JanelaExistente } from "./form";

export default async function DisponibilidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/painel-negocios/disponibilidade");
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
          Marque os dias e horários em que você atende visitas. Quem pedir uma
          visita a um imóvel seu vai ver só os horários livres e agendar direto
          — sem você precisar confirmar manualmente.
        </p>

        <DisponibilidadeForm janelasExistentes={janelas} />
      </div>

      <Footer />
    </>
  );
}
