"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { LocalizacaoImovel } from "@/components/localizacao-imovel";
import { TIPOS_APOIO, TIPOS_CADASTRAVEIS } from "@/lib/motorista/apoio";

type Status = "idle" | "enviando" | "erro";

export function AdicionarPontoApoioForm() {
  const router = useRouter();
  const [tipo, setTipo] = useState<string>("banheiro");
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [aberto24h, setAberto24h] = useState(false);
  const [gratuito, setGratuito] = useState(false);
  const [horario, setHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Sem coordenada o ponto não aparece no mapa — é o que torna o
    // cadastro útil para quem está na rua.
    if (!coords) {
      setErro("Marque a localização (use a sua localização atual ou busque pelo endereço).");
      setStatus("erro");
      return;
    }

    setStatus("enviando");
    setErro(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/entrar?depois=/motorista/apoio/adicionar");
      return;
    }

    const { data, error } = await supabase
      .from("pontos_apoio")
      .insert({
        criado_por: user.id,
        tipo,
        nome,
        endereco,
        cidade,
        estado: estado.toUpperCase(),
        latitude: coords.lat,
        longitude: coords.lng,
        aberto_24h: aberto24h,
        gratuito,
        horario: aberto24h ? null : horario || null,
        observacoes: observacoes || null,
      })
      .select("id")
      .single();

    if (error) {
      setErro(error.message);
      setStatus("erro");
      return;
    }

    router.push(`/motorista/apoio/${data.id}`);
  }

  return (
    <>
      <Nav active="/motorista/apoio" />

      <div className="wrap">
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 0 80px" }}>
          <Link href="/motorista/apoio" className="hint">
            ← Mapa de apoio
          </Link>
          <span className="eyebrow" style={{ display: "block", marginTop: 16 }}>
            Mapa de apoio
          </span>
          <h1 style={{ fontSize: 28, margin: "8px 0 4px" }}>Indicar um ponto de apoio</h1>
          <p className="muted mb-16">
            Um lugar que ajuda quem roda o dia todo: banheiro limpo, GNV, onde descansar ou comer bem.
          </p>
          <p className="hint">
            Eletroposto?{" "}
            <Link href="/eletricos/eletropostos/adicionar">Cadastre por aqui</Link> — tem campos de conector e
            potência.
          </p>

          <form className="card mt-16" onSubmit={handleSubmit}>
            <div className="field">
              <label>Tipo</label>
              <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                {TIPOS_CADASTRAVEIS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={tipo === t ? "badge badge-primary" : "badge badge-outline"}
                    style={{ cursor: "pointer", border: "none" }}
                    onClick={() => setTipo(t)}
                    aria-pressed={tipo === t}
                  >
                    {TIPOS_APOIO[t].icone} {TIPOS_APOIO[t].rotulo}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="nome">Nome do local</label>
              <input
                type="text"
                id="nome"
                placeholder="Posto Ipiranga da Marginal"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="endereco">Endereço</label>
              <input
                type="text"
                id="endereco"
                placeholder="Av. Marginal, 1000"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="cidade">Cidade</label>
                <input type="text" id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
              </div>
              <div className="field">
                <label htmlFor="estado">UF</label>
                <input
                  type="text"
                  id="estado"
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  maxLength={2}
                  required
                />
              </div>
            </div>
            <LocalizacaoImovel coords={coords} onChange={setCoords} />

            <div className="field">
              <label className="flex items-center gap-8" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={aberto24h} onChange={(e) => setAberto24h(e.target.checked)} />
                Aberto 24 horas
              </label>
              <label className="flex items-center gap-8" style={{ fontWeight: 400, marginTop: 8 }}>
                <input type="checkbox" checked={gratuito} onChange={(e) => setGratuito(e.target.checked)} />
                Gratuito (ex.: banheiro liberado sem consumir)
              </label>
            </div>
            {!aberto24h && (
              <div className="field">
                <label htmlFor="horario">
                  Horário{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <input
                  type="text"
                  id="horario"
                  placeholder="Seg a sáb, 6h às 22h"
                  value={horario}
                  onChange={(e) => setHorario(e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="observacoes">
                Dicas para outros motoristas{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <textarea
                id="observacoes"
                placeholder="Estacionamento fácil, café barato, pedem para consumir…"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>

            {erro && (
              <p className="hint" style={{ color: "var(--coral)" }}>
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block mt-16" disabled={status === "enviando"}>
              {status === "enviando" ? "Salvando…" : "Indicar ponto"}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
