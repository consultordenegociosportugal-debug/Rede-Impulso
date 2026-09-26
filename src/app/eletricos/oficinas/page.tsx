import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/server";

type OficinaRow = {
  id: string;
  nome: string;
  especialidades: string[];
  atende_marcas: string[];
  cidade: string;
  estado: string;
  endereco: string | null;
  telefone: string | null;
  descricao: string | null;
};

export default async function OficinasPage({
  searchParams,
}: {
  searchParams: Promise<{ cidade?: string }>;
}) {
  const { cidade } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("ev_oficinas")
    .select("id, nome, especialidades, atende_marcas, cidade, estado, endereco, telefone, descricao")
    .order("created_at", { ascending: false })
    .limit(48);

  if (cidade) query = query.ilike("cidade", `%${cidade}%`);

  const { data } = await query;
  const oficinas = (data ?? []) as OficinaRow[];

  return (
    <>
      <Nav active="/eletricos/oficinas" />

      <div className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <span className="eyebrow">Assistência técnica</span>
        <div className="flex between items-center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Oficinas especializadas</h1>
            <p className="muted mb-24">Quem já atende elétricos e híbridos, indicado pela comunidade.</p>
          </div>
          <Link href="/eletricos/oficinas/cadastrar" className="btn btn-primary btn-sm">
            + Cadastrar oficina
          </Link>
        </div>

        <form method="get" className="flex gap-8 mb-24">
          <input
            type="text"
            name="cidade"
            placeholder="Buscar por cidade"
            defaultValue={cidade ?? ""}
            style={{ width: 220 }}
          />
          <button type="submit" className="btn btn-outline btn-sm">
            Buscar
          </button>
        </form>

        {oficinas.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma oficina cadastrada ainda. Seja o primeiro a{" "}
              <Link href="/eletricos/oficinas/cadastrar" style={{ textDecoration: "underline" }}>
                cadastrar uma
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-3">
            {oficinas.map((oficina) => (
              <div key={oficina.id} className="card">
                <div style={{ fontWeight: 600, fontSize: 15 }}>{oficina.nome}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {oficina.endereco ? `${oficina.endereco} · ` : ""}
                  {oficina.cidade}/{oficina.estado}
                </div>
                {oficina.especialidades.length > 0 && (
                  <div className="flex gap-8 mt-8" style={{ flexWrap: "wrap" }}>
                    {oficina.especialidades.map((e) => (
                      <span key={e} className="badge badge-outline">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
                {oficina.atende_marcas.length > 0 && (
                  <p className="hint" style={{ marginTop: 8 }}>
                    Atende: {oficina.atende_marcas.join(", ")}
                  </p>
                )}
                {oficina.descricao && (
                  <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                    {oficina.descricao}
                  </p>
                )}
                {oficina.telefone && (
                  <a
                    href={`https://wa.me/55${oficina.telefone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm mt-8"
                    style={{ display: "inline-flex" }}
                  >
                    Falar no WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
