"use client";

import { useState } from "react";

const ASSUNTOS = [
  "Problema para agendar ou cancelar uma visita",
  "Dúvida sobre minha conta ou cadastro",
  "Problema com e-mail de confirmação ou lembrete",
  "Dúvida sobre cursos",
  "Sugestão ou elogio",
  "Outro assunto",
];

export function SuporteForm({
  nomeAtual,
  emailAtual,
}: {
  nomeAtual: string;
  emailAtual: string;
}) {
  const [nome, setNome] = useState(nomeAtual);
  const [email, setEmail] = useState(emailAtual);
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState(ASSUNTOS[0]);
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<"idle" | "enviando" | "enviado" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setStatus("enviando");
    setErro(null);

    try {
      const resposta = await fetch("/api/suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, assunto, mensagem }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar seu pedido.");
        setStatus("erro");
        return;
      }

      setStatus("enviado");
      setMensagem("");
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("erro");
    }
  }

  if (status === "enviado") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px 20px" }}>
        <span className="badge badge-primary">Chamado enviado</span>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          Recebemos seu pedido e vamos responder por e-mail em breve.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm mt-16"
          onClick={() => setStatus("idle")}
        >
          Enviar outro chamado
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={enviar}>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="suporte-nome">Nome</label>
          <input
            id="suporte-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="suporte-email">E-mail</label>
          <input
            id="suporte-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="suporte-telefone">
          WhatsApp <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          id="suporte-telefone"
          type="tel"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(98) 9 9999-9999"
        />
      </div>

      <div className="field">
        <label htmlFor="suporte-assunto">Assunto</label>
        <select
          id="suporte-assunto"
          value={assunto}
          onChange={(e) => setAssunto(e.target.value)}
        >
          {ASSUNTOS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="suporte-mensagem">Mensagem</label>
        <textarea
          id="suporte-mensagem"
          rows={5}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Conte com detalhes o que está acontecendo…"
          required
        />
      </div>

      {erro && (
        <p className="hint" style={{ color: "var(--coral)" }}>
          {erro}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block" disabled={status === "enviando"}>
        {status === "enviando" ? "Enviando…" : "Enviar chamado"}
      </button>
    </form>
  );
}
