import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";
import { RevisarDocumentoBotoes } from "./revisar-documento-botoes";
import { RevisarPerfilSelect } from "./revisar-perfil-select";
import { Footer } from "@/components/footer";

const TIPO_LABEL: Record<string, string> = {
  identidade: "Identidade (RG/CNH)",
  creci: "CRECI",
  cnpj: "CNPJ",
  comprovante_residencia: "Comprovante de residência",
  registro_serventia: "Registro da serventia",
  documento_imovel: "Documento do imóvel",
  foto_imovel: "Foto do imóvel",
};

const STATUS_BADGE: Record<string, string> = {
  pendente: "badge-primary",
  em_analise: "badge-amber",
  aprovado: "badge-primary",
  rejeitado: "badge-coral",
};

type DocumentoRow = {
  id: string;
  tipo: string;
  status: string;
  arquivo_url: string;
  created_at: string;
  profiles: {
    id: string;
    nome: string;
    email: string | null;
    role: string;
    verification_status: string;
  } | null;
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type MatriculaRow = {
  id: string;
  status: string;
  valor: number;
  cursos: { titulo: string } | null;
  profiles: { nome: string; email: string | null; telefone: string | null } | null;
};

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const { data } = await supabase
    .from("documentos_verificacao")
    .select(
      "id, tipo, status, arquivo_url, created_at, profiles(id, nome, email, role, verification_status)",
    )
    .order("created_at", { ascending: true });

  const documentos = (data ?? []) as unknown as DocumentoRow[];

  const comUrls = await Promise.all(
    documentos.map(async (doc) => {
      const { data: signed } = await supabase.storage
        .from("documentos-verificacao")
        .createSignedUrl(doc.arquivo_url, 300);
      return { ...doc, signedUrl: signed?.signedUrl ?? null };
    }),
  );

  const { data: matriculasData } = await supabase
    .from("matriculas")
    .select("id, status, valor, cursos(titulo), profiles(nome, email, telefone)")
    .eq("status", "pendente_pagamento")
    .order("created_at", { ascending: true });

  const matriculasPendentes = (matriculasData ?? []) as unknown as MatriculaRow[];

  const porPerfil = new Map<string, { perfil: NonNullable<DocumentoRow["profiles"]>; docs: typeof comUrls }>();
  for (const doc of comUrls) {
    if (!doc.profiles) continue;
    const entry = porPerfil.get(doc.profiles.id);
    if (entry) {
      entry.docs.push(doc);
    } else {
      porPerfil.set(doc.profiles.id, { perfil: doc.profiles, docs: [doc] });
    }
  }

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Revisão de documentos
            </h1>
          </div>
          <Link href="/admin/assistente" className="btn btn-outline btn-sm">
            🧠 Metacognição do assistente
          </Link>
        </div>
        <p className="muted mb-24">
          {comUrls.length} documento{comUrls.length === 1 ? "" : "s"} enviado
          {comUrls.length === 1 ? "" : "s"} por {porPerfil.size} pessoa
          {porPerfil.size === 1 ? "" : "s"}.
        </p>

        {porPerfil.size === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum documento enviado ainda.
            </p>
          </div>
        ) : (
          Array.from(porPerfil.values()).map(({ perfil, docs }) => (
            <div key={perfil.id} className="card mb-16">
              <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{perfil.nome}</div>
                  <div className="muted mono" style={{ fontSize: 12 }}>
                    {perfil.email} · {perfil.role}
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="hint" style={{ margin: 0 }}>
                    Status do perfil:
                  </span>
                  <RevisarPerfilSelect
                    profileId={perfil.id}
                    statusAtual={perfil.verification_status}
                  />
                </div>
              </div>

              <div className="mt-16" style={{ borderTop: "1px solid var(--line)" }}>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="list-row"
                    style={{ flexWrap: "wrap", gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                        {TIPO_LABEL[doc.tipo] ?? doc.tipo}
                      </div>
                      {doc.signedUrl && (
                        <a
                          href={doc.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hint"
                          style={{ textDecoration: "underline" }}
                        >
                          Ver documento ↗
                        </a>
                      )}
                    </div>
                    <span className={`badge ${STATUS_BADGE[doc.status] ?? "badge-outline"}`}>
                      {doc.status}
                    </span>
                    <RevisarDocumentoBotoes documentoId={doc.id} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <h2 style={{ fontSize: 20, margin: "40px 0 4px" }}>
          Matrículas com pagamento pendente
        </h2>
        <p className="muted mb-16">
          Mercado Pago ainda não está conectado — contate direto pra combinar
          o pagamento.
        </p>

        {matriculasPendentes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma matrícula pendente.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {matriculasPendentes.map((m) => (
              <div key={m.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                    {m.profiles?.nome ?? "—"}
                  </div>
                  <div className="hint" style={{ margin: 0 }}>
                    {m.cursos?.titulo} · {formatoMoeda.format(m.valor)}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {m.profiles?.telefone ?? m.profiles?.email ?? "sem contato"}
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
