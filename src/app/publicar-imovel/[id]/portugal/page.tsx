import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";
import { portaisExternosConfigurado } from "@/lib/portais-externos";
import { SincronizarPortugalForm } from "./form";

const STATUS_LABEL: Record<string, { texto: string; badge: string }> = {
  nao_sincronizado: { texto: "Nunca sincronizado", badge: "badge-outline" },
  pendente: { texto: "Sincronizando…", badge: "badge-amber" },
  publicado: { texto: "Publicado em Portugal", badge: "badge-primary" },
  erro: { texto: "Falhou na última tentativa", badge: "badge-coral" },
  desativado: { texto: "Removido de Portugal", badge: "badge-outline" },
};

export default async function SincronizarPortugalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?depois=/publicar-imovel/${id}/portugal`);
  }

  const { data } = await supabase
    .from("imoveis")
    .select("id, vendedor_id, titulo, portugal_status, portugal_erro, portugal_sincronizado_em")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    return (
      <>
        <Nav active="/painel-negocios" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Anúncio não encontrado</h1>
              <Link href="/painel-negocios" className="btn btn-primary btn-sm mt-16">
                Ver meus anúncios
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (data.vendedor_id !== user.id) {
    return (
      <>
        <Nav active="/imoveis" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <span className="badge badge-coral">Não autorizado</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>Este anúncio não é seu</h1>
              <Link href={`/imoveis/${data.id}`} className="btn btn-primary btn-sm mt-16">
                Ver o anúncio →
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const status = STATUS_LABEL[data.portugal_status] ?? STATUS_LABEL.nao_sincronizado;

  return (
    <>
      <Nav active="/painel-negocios" />
      <div className="wrap">
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 0 80px" }}>
          <span className="eyebrow">🇵🇹 Anunciar também em Portugal</span>
          <h1 style={{ fontSize: 26, margin: "8px 0 4px" }}>{data.titulo}</h1>
          <p className="muted">
            Fase inicial da ponte imobiliária entre Brasil e Portugal: publique o mesmo anúncio nos
            portais parceiros portugueses (Idealista, OLX Portugal), sem duplicar trabalho.
          </p>

          <div className="card mt-16" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className={`badge ${status.badge}`}>{status.texto}</span>
            {data.portugal_sincronizado_em && (
              <span className="hint" style={{ margin: 0 }}>
                última tentativa em {new Date(data.portugal_sincronizado_em).toLocaleString("pt-BR")}
              </span>
            )}
          </div>

          {data.portugal_erro && (
            <p className="hint" style={{ color: "var(--coral)", marginTop: 8 }}>
              {data.portugal_erro}
            </p>
          )}

          {portaisExternosConfigurado() ? (
            <SincronizarPortugalForm imovelId={data.id} />
          ) : (
            <div className="card mt-24" style={{ textAlign: "center" }}>
              <p className="muted" style={{ margin: 0 }}>
                A integração com portais portugueses ainda não está ativa nesta instalação —
                aguardando a parceria comercial com Idealista/OLX Portugal ser fechada. Assim que
                estiver disponível, este anúncio pode ser sincronizado com um clique.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
