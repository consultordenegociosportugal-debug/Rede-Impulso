import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";
import { ImprimirBotao } from "./imprimir-botao";
import styles from "./certificado.module.css";

const formatoData = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });

export default async function CertificadoPage({
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
    redirect(`/entrar?depois=/cursos/${id}/certificado`);
  }

  const [{ data: curso }, { data: matricula }, { data: perfil }] = await Promise.all([
    supabase.from("cursos").select("titulo, carga_horaria, instrutor").eq("id", id).single(),
    supabase
      .from("matriculas")
      .select("status, created_at")
      .eq("curso_id", id)
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("nome").eq("id", user.id).single(),
  ]);

  if (!curso || !matricula || matricula.status !== "concluido") {
    return (
      <>
        <Nav active="/meus-cursos" />
        <div className="wrap">
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p className="muted">
              Esse certificado ainda não está disponível — o curso precisa estar marcado
              como concluído.
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className={styles.semImpressao}>
        <Nav active="/meus-cursos" />
      </div>

      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className={`${styles.semImpressao} flex between items-center`} style={{ marginBottom: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            Salve como PDF usando a opção de impressão do seu navegador.
          </p>
          <ImprimirBotao />
        </div>

        <div className={styles.certificado}>
          <span className={styles.selo}>🎓</span>
          <p className={styles.eyebrow}>Rede Impulso — Rede Educacional</p>
          <h1 className={styles.titulo}>Certificado de Conclusão</h1>
          <p className={styles.texto}>Certificamos que</p>
          <p className={styles.nome}>{perfil?.nome ?? "—"}</p>
          <p className={styles.texto}>concluiu o curso</p>
          <p className={styles.curso}>{curso.titulo}</p>
          <p className={styles.texto}>
            {curso.carga_horaria ? `com carga horária de ${curso.carga_horaria} horas` : ""}
            {curso.instrutor ? `, ministrado por ${curso.instrutor}` : ""}.
          </p>
          <p className={styles.data}>{formatoData.format(new Date())}</p>
        </div>
      </div>

      <div className={styles.semImpressao}>
        <Footer />
      </div>
    </>
  );
}
