import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";
import { mercadoPagoConfigurado } from "@/lib/mercadopago";
import { DestacarServicoForm } from "./form";

export default async function DestacarServicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ resultado?: string }>;
}) {
  const { id } = await params;
  const { resultado } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?depois=/servicos/${id}/destacar`);
  }

  const { data } = await supabase
    .from("parceiros_servico")
    .select("id, profile_id, nome, destaque_ate")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return (
      <>
        <Nav active="/servicos" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Serviço não encontrado</h1>
              <Link href="/servicos" className="btn btn-primary btn-sm mt-16">
                Ver diretório de serviços
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (data.profile_id !== user.id) {
    return (
      <>
        <Nav active="/servicos" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <span className="badge badge-coral">Não autorizado</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>Este serviço não é seu</h1>
              <Link href="/servicos" className="btn btn-primary btn-sm mt-16">
                Ver diretório de serviços
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const destaqueAtivo = Boolean(data.destaque_ate && new Date(data.destaque_ate) > new Date());

  return (
    <>
      <Nav active="/servicos" />
      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">Destacar serviço</span>
          <h1 style={{ fontSize: 26, margin: "8px 0 4px" }}>{data.nome}</h1>
          <p className="muted">
            Serviços em destaque aparecem primeiro na própria categoria do
            diretório de parceiros — um selo discreto, sem banner nem anúncio
            no meio da página.
          </p>

          {resultado === "sucesso" && (
            <div className="card mt-16" style={{ background: "var(--primary-tint)", border: "none" }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                <strong>Pagamento em confirmação.</strong> Assim que o Mercado
                Pago confirmar, o destaque é ativado automaticamente — pode
                levar alguns minutos.
              </p>
            </div>
          )}

          {destaqueAtivo && (
            <div className="card mt-16" style={{ background: "var(--amber-tint)", border: "none" }}>
              <p style={{ margin: 0, fontSize: 14 }}>
                🚀 Este serviço já está em destaque até{" "}
                <strong>
                  {new Date(data.destaque_ate!).toLocaleDateString("pt-BR")}
                </strong>
                . Comprar um novo período soma dias ao que já está ativo.
              </p>
            </div>
          )}

          {mercadoPagoConfigurado() ? (
            <DestacarServicoForm parceiroId={data.id} />
          ) : (
            <div className="card mt-24" style={{ textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>
                O pagamento de destaque ainda não está configurado nesta
                instalação.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
