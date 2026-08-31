import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const ICONES: Record<string, string> = {
  Pintor: "🎨",
  Eletricista: "💡",
  Encanador: "🔧",
  "Instalacao de ar-condicionado": "❄️",
  Consorcio: "💰",
  Financiamento: "🏦",
  "Corretor de credito": "📊",
  "Seguro residencial": "🛡️",
  "Mudanca e frete": "🚚",
};

const CATEGORIA_LABEL: Record<string, string> = {
  comprador: "Para quem comprou",
  vendedor: "Para quem vendeu",
};

type ParceiroRow = {
  id: string;
  categoria: string;
  nome: string;
  destaque_ate: string | null;
};

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parceiros_servico")
    .select("id, categoria, nome, destaque_ate")
    .eq("ativo", true)
    .order("categoria");

  // eslint-disable-next-line react-hooks/purity -- Server Component, runs once per request; needs wall-clock time
  const agora = Date.now();
  const emDestaque = (p: ParceiroRow) => Boolean(p.destaque_ate && new Date(p.destaque_ate).getTime() > agora);

  const parceiros = ((data ?? []) as ParceiroRow[]).sort((a, b) => {
    if (emDestaque(a) === emDestaque(b)) return 0;
    return emDestaque(a) ? -1 : 1;
  });
  const categorias = Array.from(new Set(parceiros.map((p) => p.categoria)));

  return (
    <>
      <Nav active="/servicos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Serviços</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Parceiros da Rede Impulso
        </h1>
        <p className="muted mb-24">
          Depois que um negócio é concluído pela Rede Impulso, comprador e
          vendedor recebem acesso a esses parceiros — sem compromisso.
        </p>

        {parceiros.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum parceiro cadastrado no momento.
            </p>
          </div>
        ) : (
          categorias.map((categoria) => (
            <div key={categoria} className="mb-24">
              <span className="eyebrow">
                {CATEGORIA_LABEL[categoria] ?? categoria}
              </span>
              <div className="grid grid-2 mt-12">
                {parceiros
                  .filter((p) => p.categoria === categoria)
                  .map((p) => (
                    <div key={p.id} className={`card ${styles.card}`}>
                      <div className={styles.ic}>{ICONES[p.nome] ?? "🔧"}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nome}</div>
                        {emDestaque(p) && (
                          <span className="badge badge-amber" style={{ marginTop: 4 }}>
                            🚀 Destaque
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))
        )}

        <div className="card mt-16" style={{ textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>
            Publique ou encontre um imóvel pela Rede Impulso para desbloquear
            esses serviços quando o negócio fechar.
          </p>
          <Link href="/imoveis" className="btn btn-primary btn-sm mt-16">
            Ver imóveis disponíveis
          </Link>
        </div>

        <div className="card mt-16" style={{ textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>
            É pintor, eletricista ou presta outro serviço? Cadastre-se e
            apareça pra quem concluir um negócio.
          </p>
          <Link href="/oferecer-servico" className="btn btn-outline btn-sm mt-16">
            Oferecer meu serviço
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
