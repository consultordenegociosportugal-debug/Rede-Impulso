"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHECKLISTS,
  MODELOS,
  type Clausula,
  type ModeloContrato,
} from "./contratos-dados";

/** Dados do negócio já carregados no servidor, usados para preencher marcadores. */
export type Preenchimento = Record<string, string>;

type Aba = ModeloContrato["id"] | "checklist";

const TOKEN = /\[([^\]]+)\]/g;

function textoPlano(modelo: ModeloContrato, preenchido: Preenchimento) {
  const linhas: string[] = [
    modelo.titulo.toUpperCase(),
    "",
    "AVISO: rascunho de trabalho gerado pela Rede Impulso, sem revisão de advogado. Não assine nem trate como vinculante antes da validação por profissional habilitado.",
    "",
  ];
  for (const c of modelo.clausulas) {
    linhas.push(c.titulo.toUpperCase());
    for (const p of c.paragrafos) {
      linhas.push(p.replace(TOKEN, (m, chave: string) => preenchido[chave] ?? m));
    }
    linhas.push("");
  }
  return linhas.join("\n");
}

function Paragrafo({
  texto,
  preenchido,
}: {
  texto: string;
  preenchido: Preenchimento;
}) {
  const partes: React.ReactNode[] = [];
  let ultimo = 0;
  let chave = 0;

  for (const m of texto.matchAll(TOKEN)) {
    const inicio = m.index ?? 0;
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio));
    const valor = preenchido[m[1]];
    partes.push(
      valor ? (
        <strong
          key={`p${chave++}`}
          style={{
            background: "var(--primary-tint)",
            borderRadius: 4,
            padding: "0 4px",
          }}
          title="Preenchido a partir do negócio selecionado"
        >
          {valor}
        </strong>
      ) : (
        <span
          key={`p${chave++}`}
          className="mono"
          style={{ color: "var(--ink-soft)", fontSize: "0.92em" }}
        >
          [{m[1]}]
        </span>
      ),
    );
    ultimo = inicio + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));

  return (
    <p style={{ margin: "0 0 12px", whiteSpace: "pre-line" }}>{partes}</p>
  );
}

function ClausulaBloco({
  clausula,
  preenchido,
}: {
  clausula: Clausula;
  preenchido: Preenchimento;
}) {
  return (
    <section>
      <h3 style={{ fontSize: 15, margin: "24px 0 8px" }}>{clausula.titulo}</h3>
      {clausula.paragrafos.map((p, i) => (
        <Paragrafo key={i} texto={p} preenchido={preenchido} />
      ))}
    </section>
  );
}

function AvisoLegal() {
  return (
    <div className="card" style={{ background: "var(--amber-tint)", marginBottom: 24 }}>
      <p style={{ margin: 0, fontSize: 13.5 }}>
        ⚠️ <strong>Rascunho de trabalho — não é peça jurídica pronta.</strong>{" "}
        Estes modelos foram redigidos apenas como ponto de partida e{" "}
        <strong>não passaram por revisão de advogado</strong>. Contratos
        imobiliários têm consequências jurídicas e financeiras sérias: não
        assine, não entregue a clientes nem trate como vinculante antes da
        revisão por profissional habilitado, que deve adaptar o texto ao caso
        concreto, à legislação vigente e às exigências do cartório e do agente
        financeiro. A Rede Impulso não presta assessoria jurídica e não se
        responsabiliza pelo uso destes textos.
      </p>
    </div>
  );
}

function VisaoContrato({
  modelo,
  preenchido,
}: {
  modelo: ModeloContrato;
  preenchido: Preenchimento;
}) {
  // O estado de "copiado" é reiniciado a cada troca de modelo pela `key`
  // aplicada na chamada deste componente — não é preciso um efeito.
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoPlano(modelo, preenchido));
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <>
      <AvisoLegal />

      <div className="card">
        <div
          className="flex between items-center"
          style={{ gap: 12, flexWrap: "wrap", marginBottom: 8 }}
        >
          <h2 style={{ fontSize: 18, margin: 0, flex: 1, minWidth: 240 }}>
            {modelo.titulo}
          </h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={copiar}>
            {copiado ? "✓ Copiado" : "Copiar texto"}
          </button>
        </div>

        <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
          {modelo.resumo}
        </p>
        <p className="hint" style={{ marginBottom: 0 }}>
          <strong>Base legal:</strong> {modelo.baseLegal}
        </p>
      </div>

      {modelo.nota && (
        <div className="card mt-16" style={{ background: "var(--surface-2)" }}>
          <p style={{ margin: 0, fontSize: 13.5 }}>
            <strong>Observação sobre o escopo.</strong> {modelo.nota}
          </p>
        </div>
      )}

      <div className="card mt-16" style={{ fontSize: 14.5, lineHeight: 1.7 }}>
        <p className="hint" style={{ marginTop: 0 }}>
          Os trechos em <span className="mono">[COLCHETES]</span> são campos
          variáveis: preencha com os dados reais das partes e do imóvel antes de
          submeter o texto à revisão jurídica.
        </p>
        {modelo.clausulas.map((c, i) => (
          <ClausulaBloco key={i} clausula={c} preenchido={preenchido} />
        ))}
      </div>
    </>
  );
}

function lerMarcados(chave: string): Record<string, boolean> {
  // Só monta no cliente: a aba padrão é um contrato, então esta visão nunca
  // faz parte do HTML renderizado no servidor e não há risco de divergência
  // de hidratação ao ler o localStorage já na inicialização do estado.
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as Record<string, boolean>) : {};
  } catch {
    // localStorage indisponível — a checklist segue funcionando em memória.
    return {};
  }
}

function VisaoChecklist({ chaveArmazenamento }: { chaveArmazenamento: string }) {
  const [finalidade, setFinalidade] = useState<"venda" | "locacao">("venda");
  const [marcados, setMarcados] = useState<Record<string, boolean>>(() =>
    lerMarcados(chaveArmazenamento),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(chaveArmazenamento, JSON.stringify(marcados));
    } catch {
      // Ignorado de propósito: persistir é conveniência, não requisito.
    }
  }, [marcados, chaveArmazenamento]);

  const lista = CHECKLISTS.find((c) => c.id === finalidade)!;

  const total = lista.grupos.reduce((s, g) => s + g.itens.length, 0);
  const feitos = lista.grupos.reduce(
    (s, g) => s + g.itens.filter((i) => marcados[i.id]).length,
    0,
  );

  function alternar(id: string) {
    setMarcados((atual) => ({ ...atual, [id]: !atual[id] }));
  }

  function limpar() {
    setMarcados((atual) => {
      const copia = { ...atual };
      for (const g of lista.grupos) for (const i of g.itens) delete copia[i.id];
      return copia;
    });
  }

  return (
    <>
      <div className="card" style={{ background: "var(--amber-tint)", marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13.5 }}>
          ⚠️ <strong>Lista de referência, não exaustiva.</strong> As exigências
          variam conforme o cartório, o município, o banco e a situação das
          partes (espólio, pessoa jurídica, imóvel rural, incorporação).
          Confirme sempre a lista definitiva com o Tabelionato, o Cartório de
          Registro de Imóveis e o agente financeiro do negócio.
        </p>
      </div>

      <div
        className="flex between items-center mb-16"
        style={{ gap: 12, flexWrap: "wrap" }}
      >
        <div className="segmented">
          {CHECKLISTS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={finalidade === c.id ? "active" : undefined}
              onClick={() => setFinalidade(c.id)}
            >
              {c.aba}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-8">
          <span className="badge badge-primary">
            {feitos} de {total} reunidos
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={limpar}>
            Limpar
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        {lista.grupos.map((grupo) => (
          <div key={grupo.id} className="card">
            <h3 style={{ fontSize: 16, margin: "0 0 2px" }}>{grupo.titulo}</h3>
            <p className="hint" style={{ marginTop: 0 }}>
              {grupo.subtitulo}
            </p>

            {grupo.itens.map((item) => (
              <label
                key={item.id}
                className="list-row"
                style={{
                  alignItems: "flex-start",
                  gap: 10,
                  cursor: "pointer",
                  fontWeight: 400,
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(marcados[item.id])}
                  onChange={() => alternar(item.id)}
                  style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      textDecoration: marcados[item.id] ? "line-through" : "none",
                      opacity: marcados[item.id] ? 0.55 : 1,
                    }}
                  >
                    {item.nome}
                  </span>
                  {item.opcional && (
                    <span className="badge badge-outline" style={{ marginLeft: 8 }}>
                      se aplicável
                    </span>
                  )}
                  {item.detalhe && (
                    <span
                      className="hint"
                      style={{ display: "block", margin: "2px 0 0" }}
                    >
                      {item.detalhe}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <p className="hint mt-16">{lista.observacao}</p>
      <p className="hint">
        A marcação fica salva apenas neste navegador. Guardar o progresso por
        negócio na conta do corretor chega em uma próxima etapa.
      </p>
    </>
  );
}

export function ModelosContratos({
  preenchido = {},
  negocioId,
}: {
  preenchido?: Preenchimento;
  negocioId?: string;
}) {
  const [aba, setAba] = useState<Aba>("compra-venda");

  const abas = useMemo(
    () => [
      ...MODELOS.map((m) => ({ id: m.id as Aba, label: m.aba })),
      { id: "checklist" as Aba, label: "Checklist de documentos" },
    ],
    [],
  );

  const modelo = MODELOS.find((m) => m.id === aba);

  return (
    <>
      <div
        className="segmented mb-24"
        style={{ flexWrap: "wrap", maxWidth: "100%" }}
      >
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            className={aba === a.id ? "active" : undefined}
            onClick={() => setAba(a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {modelo ? (
        <VisaoContrato key={modelo.id} modelo={modelo} preenchido={preenchido} />
      ) : (
        <VisaoChecklist
          chaveArmazenamento={`ri:checklist-documentos:${negocioId ?? "geral"}`}
        />
      )}
    </>
  );
}
