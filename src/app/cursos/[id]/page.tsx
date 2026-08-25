import Link from "next/link";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { MatriculaBotao } from "./matricula-botao";
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

type CursoDetalhe = {
  id: string;
  titulo: string;
  descricao: string | null;
  instrutor: string | null;
  publico: string;
  carga_horaria: number | null;
  preco: number;
};

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("cursos")
    .select("id, titulo, descricao, instrutor, publico, carga_horaria, preco")
    .eq("id", id)
    .single();

  const curso = data as CursoDetalhe | null;

  if (!curso) {
    return (
      <>
        <Nav active="/cursos" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">Curso não encontrado.</p>
            <Link href="/cursos" className="btn btn-primary btn-sm mt-16">
              Ver outros cursos
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let matriculaExistente: string | null = null;
  if (user) {
    const { data: matricula } = await supabase
      .from("matriculas")
      .select("id")
      .eq("curso_id", curso.id)
      .eq("profile_id", user.id)
      .maybeSingle();
    matriculaExistente = matricula?.id ?? null;
  }

  return (
    <>
      <Nav active="/cursos" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <Link href="/cursos" className="hint">
          ← Voltar para cursos
        </Link>

        <div style={{ maxWidth: 620, margin: "16px auto 0" }}>
          <span className="badge badge-outline">
            {PUBLICO_LABEL[curso.publico] ?? curso.publico}
          </span>
          <h1 style={{ fontSize: 26, margin: "10px 0 4px" }}>{curso.titulo}</h1>
          <p className="muted">
            {curso.carga_horaria ? `${curso.carga_horaria} horas` : ""}
            {curso.instrutor ? ` · com ${curso.instrutor}` : ""}
          </p>

          {curso.descricao && (
            <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{curso.descricao}</p>
          )}

          <div className="card mt-16">
            <div className="mono" style={{ fontSize: 22, marginBottom: 12 }}>
              {formatoMoeda.format(curso.preco)}
            </div>
            <MatriculaBotao
              cursoId={curso.id}
              preco={curso.preco}
              matriculaExistente={matriculaExistente}
            />
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
