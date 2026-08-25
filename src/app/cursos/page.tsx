import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";
import { Footer } from "@/components/footer";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PUBLICO_LABEL: Record<string, string> = {
  corretor: "Corretores",
  imobiliaria: "Imobiliárias",
  cartorio: "Cartórios",
  todos: "Todos os perfis",
};

type CursoRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  instrutor: string | null;
  publico: string;
  carga_horaria: number | null;
  preco: number;
};

export default async function CursosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cursos")
    .select("id, titulo, descricao, instrutor, publico, carga_horaria, preco")
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  const cursos = (data ?? []) as CursoRow[];

  return (
    <>
      <Nav active="/cursos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Rede educacional</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Capacitação pra cada ponta da rede
        </h1>
        <p className="muted mb-24">
          Cursos pra corretores, imobiliárias e cartórios evoluírem dentro do
          próprio mercado que já atuam.
        </p>

        {cursos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum curso disponível no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-2">
            {cursos.map((curso) => (
              <Link
                key={curso.id}
                href={`/cursos/${curso.id}`}
                className={`card ${styles.cursoCard}`}
              >
                <span className="badge badge-outline">
                  {PUBLICO_LABEL[curso.publico] ?? curso.publico}
                </span>
                <h3 style={{ fontSize: 18, margin: "10px 0 4px" }}>{curso.titulo}</h3>
                {curso.descricao && (
                  <p className="muted" style={{ fontSize: 13.5 }}>{curso.descricao}</p>
                )}
                <div className="flex between items-center mt-16">
                  <span className="hint" style={{ margin: 0 }}>
                    {curso.carga_horaria ? `${curso.carga_horaria}h` : ""}
                    {curso.instrutor ? ` · ${curso.instrutor}` : ""}
                  </span>
                  <span className="mono" style={{ fontWeight: 600 }}>
                    {formatoMoeda.format(curso.preco)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
