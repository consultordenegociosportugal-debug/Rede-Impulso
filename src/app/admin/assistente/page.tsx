import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

const CONFIANCA_BADGE: Record<string, string> = {
  baixa: "badge-coral",
  media: "badge-amber",
  alta: "badge-primary",
};

type InteracaoRow = {
  id: string;
  pergunta: string;
  resposta: string;
  confianca: string;
  faltou: string | null;
  imoveis_encontrados: number;
  created_at: string;
  profiles: { nome: string } | null;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAssistentePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar?depois=/admin/assistente");
  }

  const { data: meuPerfil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!meuPerfil?.is_admin) {
    redirect("/");
  }

  const [{ count: totalGeral }, { count: totalBaixa }, { data: baixaData }, { data: recentesData }] =
    await Promise.all([
      supabase.from("assistente_interacoes").select("id", { count: "exact", head: true }),
      supabase
        .from("assistente_interacoes")
        .select("id", { count: "exact", head: true })
        .eq("confianca", "baixa"),
      supabase
        .from("assistente_interacoes")
        .select("id, pergunta, resposta, confianca, faltou, imoveis_encontrados, created_at, profiles(nome)")
        .eq("confianca", "baixa")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("assistente_interacoes")
        .select("id, pergunta, resposta, confianca, faltou, imoveis_encontrados, created_at, profiles(nome)")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const baixaConfianca = (baixaData ?? []) as unknown as InteracaoRow[];
  const recentes = (recentesData ?? []) as unknown as InteracaoRow[];
  const percentualBaixa =
    totalGeral && totalGeral > 0 ? Math.round(((totalBaixa ?? 0) / totalGeral) * 100) : 0;

  return (
    <>
      <Nav active="/admin" />

      <div className="wrap" style={{ padding: "48px 0 80px" }}>
        <span className="eyebrow">Administração</span>
        <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>
          Metacognição do assistente
        </h1>
        <p className="muted mb-24">
          Cada resposta do assistente vem com uma autoavaliação de confiança
          gerada pelo próprio modelo. Aqui dá pra ver onde ele está inseguro
          e por quê — sem isso, respostas fracas passam batido.
        </p>

        <div className="grid grid-3 mb-24" style={{ gap: 12 }}>
          <div className="card">
            <div className="hint" style={{ margin: 0 }}>Interações registradas</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{totalGeral ?? 0}</div>
          </div>
          <div className="card">
            <div className="hint" style={{ margin: 0 }}>Confiança baixa</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{totalBaixa ?? 0}</div>
          </div>
          <div className="card">
            <div className="hint" style={{ margin: 0 }}>% de baixa confiança</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{percentualBaixa}%</div>
          </div>
        </div>

        <h2 style={{ fontSize: 20, margin: "8px 0 4px" }}>
          Respostas de baixa confiança
        </h2>
        <p className="muted mb-16">
          O que o assistente sinalizou que não conseguiu responder bem —
          revise pra achar lacunas no sistema (dado faltando, pergunta
          ambígua recorrente, ferramenta sem cobertura).
        </p>

        {baixaConfianca.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma resposta de baixa confiança registrada ainda.
            </p>
          </div>
        ) : (
          baixaConfianca.map((item) => (
            <div key={item.id} className="card mb-16">
              <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 8 }}>
                <span className={`badge ${CONFIANCA_BADGE[item.confianca] ?? "badge-outline"}`}>
                  {item.confianca}
                </span>
                <span className="hint" style={{ margin: 0 }}>
                  {formatarData(item.created_at)} · {item.profiles?.nome ?? "visitante"}
                </span>
              </div>
              <p style={{ margin: "10px 0 4px", fontWeight: 600, fontSize: 14 }}>
                {item.pergunta}
              </p>
              <p className="muted" style={{ margin: "0 0 8px", fontSize: 13.5 }}>
                {item.resposta}
              </p>
              {item.faltou && (
                <p className="hint" style={{ margin: 0, color: "var(--coral)" }}>
                  Faltou: {item.faltou}
                </p>
              )}
            </div>
          ))
        )}

        <h2 style={{ fontSize: 20, margin: "40px 0 4px" }}>
          Interações recentes (todas)
        </h2>

        {recentes.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma interação registrada ainda.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: "8px 20px" }}>
            {recentes.map((item) => (
              <div key={item.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.pergunta}</div>
                  <div className="hint" style={{ margin: 0 }}>
                    {formatarData(item.created_at)} · {item.profiles?.nome ?? "visitante"}
                  </div>
                </div>
                <span className={`badge ${CONFIANCA_BADGE[item.confianca] ?? "badge-outline"}`}>
                  {item.confianca}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="mt-24">
          <Link href="/admin" style={{ textDecoration: "underline" }}>
            ← Voltar pra administração
          </Link>
        </p>
      </div>

      <Footer />
    </>
  );
}
