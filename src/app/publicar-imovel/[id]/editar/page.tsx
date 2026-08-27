import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { Footer } from "@/components/footer";
import { EditarImovelForm, type ImovelEdicao, type FotoExistente } from "./form";

export default async function EditarImovelPage({
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
    redirect(`/entrar?depois=/publicar-imovel/${id}/editar`);
  }

  const { data } = await supabase
    .from("imoveis")
    .select(
      "id, vendedor_id, titulo, bairro, cidade, descricao, preco, finalidade, tipo, quartos, banheiros, vagas, area_m2, comodidades, latitude, longitude, status",
    )
    .eq("id", id)
    .maybeSingle();

  const imovel = data as unknown as ImovelEdicao | null;

  if (!imovel) {
    return (
      <>
        <Nav active="/painel-negocios" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>
                Anúncio não encontrado
              </h1>
              <p className="muted">
                Este imóvel não existe mais ou você não tem acesso a ele.
              </p>
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

  if (imovel.vendedor_id !== user.id) {
    return (
      <>
        <Nav active="/imoveis" />
        <div className="wrap">
          <div style={{ maxWidth: 480, margin: "64px auto", textAlign: "center" }}>
            <div className="card">
              <span className="badge badge-coral">Não autorizado</span>
              <h1 style={{ fontSize: 22, margin: "12px 0 4px" }}>
                Este anúncio não é seu
              </h1>
              <p className="muted">
                Só quem publicou o imóvel pode editar o anúncio. Você pode ver a
                página pública dele normalmente.
              </p>
              <Link href={`/imoveis/${imovel.id}`} className="btn btn-primary btn-sm mt-16">
                Ver o anúncio →
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const { data: fotos } = await supabase
    .from("imovel_fotos")
    .select("id, arquivo_url, ordem")
    .eq("imovel_id", imovel.id)
    .order("ordem", { ascending: true });

  return (
    <EditarImovelForm
      imovel={imovel}
      fotosIniciais={(fotos ?? []) as FotoExistente[]}
    />
  );
}
