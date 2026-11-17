import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { EditarCursoForm } from "./editar-curso-form";
import { MateriaisManager } from "./materiais-manager";
import { MatriculasManager } from "./matriculas-manager";

export default async function AdminCursoDetalhePage({
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
    redirect(`/entrar?depois=/admin/cursos/${id}`);
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const [{ data: curso }, { data: materiaisData }, { data: matriculasData }] = await Promise.all([
    supabase
      .from("cursos")
      .select("id, titulo, descricao, instrutor, publico, carga_horaria, preco, liberacao_imediata")
      .eq("id", id)
      .single(),
    supabase
      .from("curso_materiais")
      .select("id, titulo, arquivo_url, ordem")
      .eq("curso_id", id)
      .order("ordem", { ascending: true }),
    supabase
      .from("matriculas")
      .select("id, status, valor, profiles(nome, email)")
      .eq("curso_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!curso) {
    redirect("/admin/cursos");
  }

  const materiais = materiaisData ?? [];
  const matriculas = (matriculasData ?? []) as unknown as {
    id: string;
    status: string;
    valor: number;
    profiles: { nome: string; email: string | null } | null;
  }[];

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 24, margin: "8px 0 4px" }}>{curso.titulo}</h1>
          </div>
          <Link href="/admin/cursos" className="btn btn-outline btn-sm">
            ← Voltar pra cursos
          </Link>
        </div>

        <div className="grid grid-2 mt-24" style={{ gap: 24, alignItems: "start" }}>
          <EditarCursoForm curso={curso} />
          <MateriaisManager cursoId={curso.id} materiais={materiais} />
        </div>

        <div className="mt-24">
          <MatriculasManager matriculas={matriculas} />
        </div>
      </div>

      <Footer />
    </>
  );
}
