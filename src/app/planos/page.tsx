import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { mercadoPagoConfigurado } from "@/lib/mercadopago";
import { PlanosForm } from "./form";

export const metadata = {
  title: "Plano Profissional | Rede Impulso",
  description:
    "Publique mais imóveis ao mesmo tempo com o Plano Profissional da Rede Impulso — 2 anúncios sempre grátis, planos a partir de R$ 139,90/mês.",
};

type AssinaturaAtiva = { plano: string; limite: number; status: string };

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
      .select("plano, limite, status")
      .eq("profile_id", user.id)
      .eq("status", "ativa")
      .order("limite", { ascending: false })
      .limit(1)
      .maybeSingle();
    assinaturaAtiva = data;
  }

  return (
    <>
      <Nav active="/planos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <span className="eyebrow">Plano Profissional</span>
          <h1 style={{ fontSize: 30, margin: "8px 0 4px" }}>
            Publique mais imóveis ao mesmo tempo
          </h1>
          <p className="muted">
            Todo corretor e imobiliária publica{" "}
            <strong>2 imóveis ativos de graça, para sempre</strong> — sem
            assinar nada. Pra publicar mais ao mesmo tempo, escolha um plano
            abaixo.
          </p>

          {resultado === "sucesso" && (
            <div
              className="card mt-16"
              style={{ background: "var(--primary-tint)", border: "none" }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Assinatura em confirmação.</strong> Assim que o
                Mercado Pago autorizar a cobrança recorrente, seu limite de
                anúncios é atualizado automaticamente.
              </p>
            </div>
          )}

          {assinaturaAtiva && (
            <div
              className="card mt-16"
              style={{ background: "var(--amber-tint)", border: "none" }}
            >
              <p style={{ margin: 0, fontSize: 14 }}>
                🚀 Você já está no <strong>Profissional {assinaturaAtiva.plano}</strong> —
                até {assinaturaAtiva.limite} imóveis ativos ao mesmo tempo.
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
              <div style={{ fontSize: 20 }}>🏅</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Selo profissional
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Seus anúncios se destacam para quem está decidindo em quem
                confiar.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>📈</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Mais imóveis ativos
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Publique sua carteira inteira sem precisar pausar um anúncio
                pra ativar outro.
              </p>
            </div>
            <div className="card">
              <div style={{ fontSize: 20 }}>💬</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 8 }}>
                Sem cobrança por lead
              </div>
              <p className="hint" style={{ marginBottom: 0 }}>
                Valor fixo mensal — cada contato recebido não custa nada
                além da assinatura.
              </p>
            </div>
          </div>

          <p className="hint mt-24">
            Cobrança recorrente mensal via Mercado Pago, cancelável quando
            quiser diretamente com o suporte. Dúvidas?{" "}
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
