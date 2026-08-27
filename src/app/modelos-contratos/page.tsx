import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { ModelosContratos, type Preenchimento } from "./modelos-cliente";

export const metadata = {
  title: "Modelos de contrato e checklist de documentos | Rede Impulso",
  description:
    "Modelos de contrato de compra e venda, locação residencial e intermediação imobiliária, além do checklist de documentos do vendedor e do comprador.",
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

type NegocioContexto = {
  id: string;
  valor_fechado: number | null;
  imoveis: {
    titulo: string;
    bairro: string;
    cidade: string;
    preco: number | null;
    finalidade: "venda" | "aluguel";
    vendedor: { nome: string } | null;
  } | null;
  comprador: { nome: string } | null;
  corretor: { nome: string } | null;
  imobiliaria: { nome: string } | null;
};

/**
 * Monta o mapa de marcadores preenchíveis a partir do que já existe no
 * banco. Só entram campos de que temos certeza — o restante segue como
 * [CAMPO ENTRE COLCHETES] para o corretor completar.
 */
function montarPreenchimento(negocio: NegocioContexto | null): Preenchimento {
  if (!negocio) return {};

  const preenchido: Preenchimento = {};
  const imovel = negocio.imoveis;
  const aluguel = imovel?.finalidade === "aluguel";

  if (imovel) {
    preenchido["IMÓVEL"] = [imovel.titulo, imovel.bairro].filter(Boolean).join(", ");
    if (imovel.cidade) {
      preenchido["CIDADE DO FORO"] = imovel.cidade;
      preenchido["CIDADE"] = imovel.cidade;
    }
  }

  const valor = negocio.valor_fechado ?? imovel?.preco ?? null;
  if (valor !== null) {
    preenchido[aluguel ? "VALOR DO ALUGUEL" : "VALOR TOTAL"] =
      formatoMoeda.format(valor);
  }

  const vendedor = imovel?.vendedor?.nome;
  if (vendedor) {
    preenchido["NOME DO CONTRATANTE"] = vendedor;
    preenchido[aluguel ? "NOME DO LOCADOR" : "NOME DO VENDEDOR"] = vendedor;
  }

  const contraparte = negocio.comprador?.nome;
  if (contraparte) {
    preenchido[aluguel ? "NOME DO LOCATÁRIO" : "NOME DO COMPRADOR"] = contraparte;
  }

  const intermediario = negocio.imobiliaria?.nome ?? negocio.corretor?.nome;
  if (intermediario) {
    preenchido["CORRETOR/IMOBILIÁRIA"] = intermediario;
    preenchido["IMOBILIÁRIA"] = negocio.imobiliaria?.nome ?? intermediario;
  }

  return preenchido;
}

export default async function ModelosContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ negocio_id?: string }>;
}) {
  const { negocio_id } = await searchParams;

  let negocio: NegocioContexto | null = null;

  if (negocio_id) {
    const supabase = await createClient();
    // RLS decide o que este usuário pode ler; se não puder, seguimos com o
    // modelo em branco em vez de bloquear a página.
    const { data } = await supabase
      .from("negocios")
      .select(
        "id, valor_fechado, imoveis(titulo, bairro, cidade, preco, finalidade, vendedor:vendedor_id(nome)), comprador:comprador_id(nome), corretor:corretor_id(nome), imobiliaria:imobiliaria_id(nome)",
      )
      .eq("id", negocio_id)
      .maybeSingle();

    negocio = (data as unknown as NegocioContexto) ?? null;
  }

  const preenchido = montarPreenchimento(negocio);
  const camposPreenchidos = Object.keys(preenchido).length;

  return (
    <>
      <Nav active="/modelos-contratos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <span className="eyebrow">Documentos do negócio</span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
            Modelos de contrato e checklist de documentos
          </h1>
          <p className="hint">
            Três modelos de contrato para adaptar ao seu negócio e a relação de
            documentos exigidos de cada parte. Última revisão do texto-base: a
            definir na publicação.
          </p>

          {negocio && camposPreenchidos > 0 && (
            <div className="card" style={{ background: "var(--primary-tint)", margin: "16px 0 0" }}>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                📄 Modelos abertos a partir do negócio{" "}
                <strong>{negocio.imoveis?.titulo ?? "selecionado"}</strong>. Os
                campos que a plataforma já conhece aparecem destacados no texto
                — confira cada um antes de usar. Todos os demais continuam entre
                colchetes para preenchimento manual.{" "}
                <Link href="/modelos-contratos" style={{ textDecoration: "underline" }}>
                  Ver modelo em branco
                </Link>
              </p>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <ModelosContratos preenchido={preenchido} negocioId={negocio?.id} />
          </div>

          <p className="hint mt-24">
            Precisa de apoio jurídico para revisar o contrato?{" "}
            <Link href="/servicos" style={{ textDecoration: "underline" }}>
              Veja os serviços parceiros
            </Link>{" "}
            ou fale com a sua imobiliária.
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
