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

type ClienteAvulsoRow = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  imovel_interesse: string | null;
  created_at: string;
  corretor: {
    nome: string;
    corretor_perfis: { organizacao: { nome: string; tipo: string } | null } | null;
  } | null;
};

type NpsRow = {
  id: string;
  nota: number;
  comentario: string | null;
  created_at: string;
  visitas: {
    corretor: {
      nome: string;
      corretor_perfis: { organizacao: { nome: string } | null } | null;
    } | null;
  } | null;
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

  const { data: clientesAvulsosData } = await supabase
    .from("clientes_avulsos")
    .select(
      "id, nome, telefone, cidade, imovel_interesse, created_at, corretor:corretor_id(nome, corretor_perfis!profile_id(organizacao:organizacao_catalogo_id(nome, tipo)))",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const clientesAvulsos = (clientesAvulsosData ?? []) as unknown as ClienteAvulsoRow[];

  const { data: npsData } = await supabase
    .from("nps_respostas")
    .select(
      "id, nota, comentario, created_at, visitas!inner(corretor:corretor_id(nome, corretor_perfis!profile_id(organizacao:organizacao_catalogo_id(nome))))",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const npsRespostas = (npsData ?? []) as unknown as NpsRow[];

  const npsPorCorretor = new Map<string, { nome: string; organizacao: string | null; notas: number[] }>();
  for (const r of npsRespostas) {
    const nome = r.visitas?.corretor?.nome ?? "—";
    const organizacao = r.visitas?.corretor?.corretor_perfis?.organizacao?.nome ?? null;
    const entry = npsPorCorretor.get(nome) ?? { nome, organizacao, notas: [] };
    entry.notas.push(r.nota);
    npsPorCorretor.set(nome, entry);
  }
  const npsResumo = Array.from(npsPorCorretor.values())
    .map((c) => ({
      ...c,
      media: c.notas.reduce((s, n) => s + n, 0) / c.notas.length,
      total: c.notas.length,
    }))
    .sort((a, b) => b.media - a.media);

  const mediaGeral =
    npsRespostas.length > 0
      ? npsRespostas.reduce((s, r) => s + r.nota, 0) / npsRespostas.length
      : null;

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

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="eyebrow">Administração</span>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
              Revisão de documentos
            </h1>
          </div>
          <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
            <Link href="/admin/suporte" className="btn btn-outline btn-sm">
              💬 Suporte
            </Link>
            <Link href="/admin/catalogo" className="btn btn-outline btn-sm">
              🏢 Catálogo de cidades e organizações
            </Link>
          </div>
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
          Clientes cadastrados pelos corretores
        </h2>
        <p className="muted mb-16">
          Clientes de balcão (sem login) cadastrados direto pelo corretor, com a
          imobiliária/construtora que ele estiver vinculado.
        </p>

        {clientesAvulsos.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhum cliente cadastrado por corretor ainda.
            </p>
          </div>
        ) : (
          <div className="card mb-24" style={{ padding: "8px 20px" }}>
            {clientesAvulsos.map((cliente) => {
              const organizacao = cliente.corretor?.corretor_perfis?.organizacao;
              return (
                <div key={cliente.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{cliente.nome}</div>
                    <div className="hint" style={{ margin: 0 }}>
                      {cliente.telefone ?? "sem telefone"}
                      {cliente.cidade ? ` · ${cliente.cidade}` : ""}
                    </div>
                    {cliente.imovel_interesse && (
                      <div className="hint" style={{ margin: 0 }}>
                        Interesse: {cliente.imovel_interesse}
                      </div>
                    )}
                  </div>
                  <div className="mono" style={{ fontSize: 12, textAlign: "right" }}>
                    <div>Corretor: {cliente.corretor?.nome ?? "—"}</div>
                    <div className="muted">
                      {organizacao ? `${organizacao.nome} (${organizacao.tipo})` : "autônomo"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h2 style={{ fontSize: 20, margin: "40px 0 4px" }}>
          Qualidade do atendimento (NPS)
        </h2>
        <p className="muted mb-16">
          Nota de 0 a 10 que o cliente dá depois da visita.
          {mediaGeral !== null && (
            <>
              {" "}
              Média geral: <strong>{mediaGeral.toFixed(1)}</strong> ({npsRespostas.length}{" "}
              avaliações).
            </>
          )}
        </p>

        {npsResumo.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma avaliação recebida ainda.
            </p>
          </div>
        ) : (
          <div className="card mb-24" style={{ padding: "8px 20px" }}>
            {npsResumo.map((c) => (
              <div key={c.nome} className="list-row">
                <div className="flex between items-center" style={{ width: "100%", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</div>
                    {c.organizacao && <div className="hint" style={{ margin: 0 }}>{c.organizacao}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 18 }}>{c.media.toFixed(1)}</div>
                    <div className="hint" style={{ margin: 0 }}>
                      {c.total} avaliaç{c.total === 1 ? "ão" : "ões"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
