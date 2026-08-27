"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Papel = "user" | "assistant";
type Mensagem = { role: Papel; content: string };
type ImovelResultado = {
  id: string;
  titulo: string;
  bairro: string;
  cidade: string;
  preco: number | null;
  quartos: number | null;
};

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function AssistenteIA() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [imoveis, setImoveis] = useState<ImovelResultado[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, aberto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const pergunta = texto.trim();
    if (!pergunta || enviando) return;

    const novasMensagens: Mensagem[] = [...mensagens, { role: "user", content: pergunta }];
    setMensagens(novasMensagens);
    setTexto("");
    setEnviando(true);

    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: novasMensagens }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagens((m) => [
          ...m,
          { role: "assistant", content: "Não consegui responder agora. Tenta de novo em instantes?" },
        ]);
        return;
      }

      setMensagens((m) => [...m, { role: "assistant", content: dados.reply }]);
      setImoveis(dados.imoveis ?? []);
    } catch {
      setMensagens((m) => [
        ...m,
        { role: "assistant", content: "Sem conexão no momento. Tenta de novo em instantes?" },
      ]);
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
              <strong>Assistente Rede Impulso</strong>
              <div className="hint" style={{ margin: 0 }}>
                Disponível 24h para ajudar
              </div>
            </div>
            <button
              type="button"
              className="assistente-fechar"
              onClick={() => setAberto(false)}
              aria-label="Fechar assistente"
            >
              ✕
            </button>
          </div>

          <div className="assistente-corpo">
            {mensagens.length === 0 && (
              <div className="assistente-boasvindas">
                <p style={{ margin: 0, fontWeight: 600 }}>Oi! Sou o assistente da Rede Impulso.</p>
                <p className="hint">
                  Posso te ajudar a encontrar um imóvel, tirar dúvidas sobre a plataforma ou dar
                  uma força na hora de anunciar. O que você precisa?
                </p>
              </div>
            )}

            {mensagens.map((m, i) => (
              <div key={i} className={`assistente-msg assistente-msg-${m.role}`}>
                {m.content}
              </div>
            ))}

            {imoveis.length > 0 && (
              <div className="assistente-resultados">
                {imoveis.map((imovel) => (
                  <Link
                    key={imovel.id}
                    href={`/imoveis/${imovel.id}`}
                    className="assistente-card-imovel"
                    onClick={() => setAberto(false)}
                  >
                    <strong>{imovel.titulo}</strong>
                    <span className="hint" style={{ margin: 0 }}>
                      {imovel.bairro}, {imovel.cidade}
                      {imovel.quartos ? ` · ${imovel.quartos}q` : ""}
                    </span>
                    <span className="mono" style={{ fontSize: 13.5 }}>
                      {imovel.preco ? formatoMoeda.format(imovel.preco) : "Preço a combinar"}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {enviando && <div className="assistente-msg assistente-msg-assistant">Digitando…</div>}
            <div ref={fimRef} />
          </div>

          <form className="assistente-rodape" onSubmit={enviar}>
            <input
              type="text"
              placeholder="Digite sua pergunta…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={enviando}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={enviando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistente-botao"
        onClick={() => setAberto((v) => !v)}
        aria-label="Abrir assistente da Rede Impulso"
      >
        {aberto ? "✕" : "💬"}
      </button>
    </div>
  );
}
