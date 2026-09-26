"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Copiloto do motorista — botão flutuante em todas as páginas (fase 2).
// Mesmo visual do antigo assistente de imóveis (classes .assistente-* em
// globals.css), que volta no lugar dele se o módulo imobiliário acordar.

type Mensagem = { role: "user" | "assistant"; content: string };
type LinkCopiloto = { href: string; titulo: string; detalhe: string };

const SUGESTOES = [
  "Quanto estou lucrando por hora?",
  "Vale a pena trocar para um elétrico?",
  "O que muda hoje para motoristas?",
  "Onde carregar perto de mim?",
];

export function Copiloto() {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [links, setLinks] = useState<LinkCopiloto[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, links, aberto]);

  async function abrir() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    if (vaiAbrir && logado === null) {
      const { data } = await createClient().auth.getUser();
      setLogado(Boolean(data.user));
    }
  }

  async function perguntar(pergunta: string) {
    pergunta = pergunta.trim();
    if (!pergunta || enviando) return;

    const novas: Mensagem[] = [...mensagens, { role: "user", content: pergunta }];
    setMensagens(novas);
    setLinks([]);
    setTexto("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/copiloto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: novas }),
      });
      const dados = await resposta.json().catch(() => ({}));

      if (resposta.status === 401) {
        setLogado(false);
        return;
      }
      setMensagens((m) => [
        ...m,
        {
          role: "assistant",
          content: resposta.ok ? dados.reply : (dados.erro ?? "Não consegui responder agora. Tenta de novo?"),
        },
      ]);
      setLinks(resposta.ok ? (dados.links ?? []) : []);
    } catch {
      setMensagens((m) => [...m, { role: "assistant", content: "Sem conexão no momento. Tenta de novo?" }]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="assistente-raiz">
      {aberto && (
        <div className="assistente-painel">
          <div className="assistente-cabecalho">
            <div>
              <strong>Copiloto Rede Impulso</strong>
              <div className="hint" style={{ margin: 0 }}>
                Seu parceiro para ganhos, recarga e o carro
              </div>
            </div>
            <button
              type="button"
              className="assistente-fechar"
              onClick={() => setAberto(false)}
              aria-label="Fechar copiloto"
            >
              ✕
            </button>
          </div>

          <div className="assistente-corpo">
            {logado === false ? (
              <div className="assistente-boasvindas">
                <p style={{ margin: 0, fontWeight: 600 }}>Entre para falar com o copiloto.</p>
                <p className="hint">
                  Com a sua conta ele consegue olhar o seu Raio-X e responder com os seus números. É grátis.
                </p>
                <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                  <Link
                    href={`/entrar?depois=${encodeURIComponent(pathname)}`}
                    className="btn btn-primary btn-sm"
                    onClick={() => setAberto(false)}
                  >
                    Entrar
                  </Link>
                  <Link href="/cadastro-cliente" className="btn btn-outline btn-sm" onClick={() => setAberto(false)}>
                    Criar conta
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {mensagens.length === 0 && (
                  <div className="assistente-boasvindas">
                    <p style={{ margin: 0, fontWeight: 600 }}>Oi! Sou o copiloto da Rede Impulso.</p>
                    <p className="hint">
                      Olho o seu Raio-X, o radar do dia, eletropostos, oficinas e elétricos à venda — e pesquiso o
                      que faltar. Por onde começamos?
                    </p>
                    <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
                      {SUGESTOES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => perguntar(s)}
                          disabled={enviando}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mensagens.map((m, i) => (
                  <div
                    key={i}
                    className={`assistente-msg assistente-msg-${m.role}`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {m.content}
                  </div>
                ))}

                {links.length > 0 && (
                  <div className="assistente-resultados">
                    {links.map((l) => (
                      <Link
                        key={`${l.href}-${l.titulo}`}
                        href={l.href}
                        className="assistente-card-imovel"
                        onClick={() => setAberto(false)}
                      >
                        <strong>{l.titulo}</strong>
                        <span className="hint" style={{ margin: 0 }}>
                          {l.detalhe}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {enviando && <div className="assistente-msg assistente-msg-assistant">Pensando…</div>}
              </>
            )}
            <div ref={fimRef} />
          </div>

          {logado !== false && (
            <form
              className="assistente-rodape"
              onSubmit={(e) => {
                e.preventDefault();
                perguntar(texto);
              }}
            >
              <input
                type="text"
                placeholder="Pergunte ao copiloto…"
                value={texto}
                maxLength={2000}
                onChange={(e) => setTexto(e.target.value)}
                disabled={enviando}
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={enviando || !texto.trim()}>
                Enviar
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        className="assistente-botao"
        onClick={abrir}
        aria-label={aberto ? "Fechar copiloto" : "Abrir copiloto da Rede Impulso"}
      >
        {aberto ? "✕" : "🧭"}
      </button>
    </div>
  );
}
