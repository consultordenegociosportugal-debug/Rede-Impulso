"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Candidato = {
  id: string;
  nome: string;
  email: string | null;
  role: string;
  is_admin: boolean;
};

export function BuscarEPromoverAdmin() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [candidatos, setCandidatos] = useState<Candidato[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [promovendo, setPromovendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const termo = busca.trim();
    if (!termo) return;

    setBuscando(true);
    setErro(null);
    setCandidatos(null);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, email, role, is_admin")
      .or(`email.ilike.%${termo}%,nome.ilike.%${termo}%`)
      .limit(10);

    setBuscando(false);

    if (error) {
      setErro("Não foi possível buscar. Tente de novo.");
      return;
    }

    setCandidatos((data ?? []) as Candidato[]);
  }

  async function promover(id: string) {
    setPromovendo(id);
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("definir_admin", { p_profile_id: id, p_admin: true });

    setPromovendo(null);

    if (error) {
      setErro("Não foi possível promover. Tente de novo.");
      return;
    }

    router.refresh();
    setCandidatos((lista) =>
      lista ? lista.map((c) => (c.id === id ? { ...c, is_admin: true } : c)) : lista,
    );
  }

  return (
    <div className="card mt-24" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Promover alguém a administrador</h2>
      <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Busque por e-mail ou nome — a pessoa já precisa ter uma conta na Rede Impulso.
      </p>

      <form onSubmit={buscar} className="flex gap-8" style={{ flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="E-mail ou nome"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="submit" className="btn btn-outline btn-sm" disabled={buscando}>
          {buscando ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)", marginTop: 8 }}>
          {erro}
        </p>
      )}

      {candidatos !== null && (
        <div className="mt-16" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          {candidatos.length === 0 ? (
            <p className="hint" style={{ margin: 0 }}>Ninguém encontrado com esse termo.</p>
          ) : (
            candidatos.map((c) => (
              <div key={c.id} className="list-row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.nome}</div>
                  <div className="hint" style={{ margin: 0 }}>
                    {c.email ?? "sem e-mail"} · {c.role}
                  </div>
                </div>
                {c.is_admin ? (
                  <span className="hint" style={{ margin: 0 }}>Já é admin</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={promovendo === c.id}
                    onClick={() => promover(c.id)}
                  >
                    {promovendo === c.id ? "Promovendo…" : "Tornar admin"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
