import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { requireAdmin } from "@/lib/supabase/require-admin";
import { NovoCursoForm } from "./novo-curso-form";
import { AlternarAtivoButton } from "./alternar-ativo-button";

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const PUBLICO_LABEL: Record<string, string> = {
  corretor: "Corretores",
  imobiliaria: "Imobiliárias",
  cartorio: "Cartórios",
  todos: "Todos os perfis",
};

type CursoRow = {
  id: string;
  titulo: string;
  publico: string;
  carga_horaria: number | null;
  preco: number;
  ativo: boolean;
};

export default async function AdminCursosPage() {
  const { supabase } = await requireAdmin("/admin/cursos");

  const { data } = await supabase
    .from("cursos")
    .select("id, titulo, publico, carga_horaria, preco, ativo")
    .order("created_at", { ascending: false });

  const cursos = (data ?? []) as CursoRow[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Cursos e matrículas</h1>
            <p className="muted" style={{ marginBottom: 0 }}>
              Pagamento via Mercado Pago ainda não está conectado — matrícula nasce "pendente
              de pagamento" e você marca como paga/concluída aqui mesmo.
            </p>
          </div>
          <Link href="/admin" className="btn btn-outline btn-sm">
            ← Voltar pra administração
          </Link>
        </div>

        <div className="mt-24" style={{ maxWidth: 560 }}>
          <NovoCursoForm />
        </div>

        <h2 style={{ fontSize: 18, margin: "24px 0 12px" }}>
          Cursos cadastrados{cursos.length > 0 ? ` (${cursos.length})` : ""}
        </h2>

        {cursos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
            <p className="muted" style={{ margin: 0 }}>Nenhum curso cadastrado ainda.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 16px" }}>
            {cursos.map((curso) => (
              <div key={curso.id} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <Link href={`/admin/cursos/${curso.id}`} style={{ fontWeight: 600, fontSize: 14 }}>
                      {curso.titulo}
                    </Link>
                    <div className="hint" style={{ margin: 0 }}>
                      {PUBLICO_LABEL[curso.publico] ?? curso.publico}
                      {curso.carga_horaria ? ` · ${curso.carga_horaria}h` : ""}
                      {` · ${formatoMoeda.format(curso.preco)}`}
                      {!curso.ativo ? " · inativo" : ""}
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <Link href={`/admin/cursos/${curso.id}`} className="btn btn-outline btn-sm">
                      Gerenciar
                    </Link>
                    <AlternarAtivoButton cursoId={curso.id} ativo={curso.ativo} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
