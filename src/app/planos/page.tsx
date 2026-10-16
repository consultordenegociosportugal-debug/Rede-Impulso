import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { mercadoPagoConfigurado } from "@/lib/mercadopago";
import { PlanosForm } from "./form";

export const metadata = {
  title: "Planos de equipe | Rede Impulso",
  description:
    "Amplie sua equipe de corretores na Rede Impulso — até 2 corretores sempre grátis, planos a partir de R$ 69,90/mês no ciclo anual.",
};

type AssinaturaAtiva = { plano: string; limite: number; limite_equipe: number | null; status: string };

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { resultado } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let assinaturaAtiva: AssinaturaAtiva | null = null;
  if (user) {
    const { data } = await supabase
      .from("assinaturas_plano")
      .select("plano, limite, limite_equipe, status")
      .eq("profile_id", user.id)
      .eq("status", "ativa")
      .order("limite_equipe", { ascending: false })
      .limit(1)
      .maybeSingle();
    assinaturaAtiva = data;
  }

  return (
    <>
      <Nav active="/planos" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <span className="eyebrow">Planos de equipe</span>
          <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>
            Amplie sua equipe de corretores
          </h1>
          <p className="muted">
            Toda imobiliária gerencia{" "}
            <strong>até 2 corretores de graça, para sempre</strong> — sem
            assinar nada. Pra convidar mais gente pro Dashboard, pro
            agendamento e pro painel de equipe, escolha um plano abaixo.
          </p>

          {resultado === "sucesso" && (
            <div
              className="card mt-16"
              style={{ background: "var(--primary-tint)", border: "none" }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Assinatura em confirmação.</strong> Assim que o
                Mercado Pago autorizar a cobrança recorrente, o limite da sua
                equipe é atualizado automaticamente.
              </p>
            </div>
          )}

          {assinaturaAtiva && (
            <div
              className="card mt-16"
              style={{ background: "var(--amber-tint)", border: "none" }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                🚀 Você já tem um plano ativo — até{" "}
                {assinaturaAtiva.limite_equipe ?? assinaturaAtiva.limite} corretores na equipe
                e {assinaturaAtiva.limite} imóveis ativos.
              </p>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            {mercadoPagoConfigurado() ? (
              <PlanosForm logado={Boolean(user)} />
            ) : (
              <div className="card" style={{ textAlign: "center" }}>
                <p className="muted" style={{ margin: 0 }}>
                  A assinatura do Plano Profissional ainda não está
                  configurada nesta instalação.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-3 mt-24">
            <div className="card">
              <div style={{ fontSize: 20 }}>👥</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Convide a equipe toda
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Cada corretor com login próprio, agenda própria e aparecendo
                no Dashboard e no Relatório de visitas da imobiliária.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>🗓️</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Agendamento sem limite
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Agendamento automático de visitas liberado pra equipe inteira,
                em qualquer plano.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>💬</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Sem cobrança por lead
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Valor fixo por ciclo — cada contato recebido não custa nada
                além da assinatura.
              </p>
            </div>
          </div>

          <p className="hint mt-24">
            Cobrança recorrente via Mercado Pago no ciclo escolhido, cancelável
            quando quiser diretamente com o suporte. Dúvidas?{" "}
            <Link href="/sobre" style={{ textDecoration: "underline" }}>
              Veja como funciona a Rede Impulso
            </Link>
            .
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
