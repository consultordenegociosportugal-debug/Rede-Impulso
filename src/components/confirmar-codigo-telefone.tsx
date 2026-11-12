"use client";

import { useEffect, useRef, useState } from "react";

const RESEND_COOLDOWN_SEGUNDOS = 30;

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
};

/**
 * Tela de código (OTP) pro telefone de contato — mesmo padrão do
 * ConfirmarCodigoEmail, mas chamando as rotas próprias de telefone
 * (POST /api/telefone/enviar-codigo e .../verificar-codigo) em vez do
 * Supabase Auth, porque esse canal (WhatsApp com reserva em SMS) não é
 * nenhum dos provedores nativos de telefone do Supabase.
 */
export function ConfirmarCodigoTelefone({
  telefone,
  onVerificado,
  onPular,
}: {
  telefone: string;
  onVerificado: () => void;
  onPular?: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<"enviando" | "idle" | "verificando" | "erro">("enviando");
  const [erro, setErro] = useState<string | null>(null);
  const [canal, setCanal] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const jaEnviou = useRef(false);

  function iniciarCooldown() {
    setCooldown(RESEND_COOLDOWN_SEGUNDOS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function enviar() {
    setStatus("enviando");
    setErro(null);
    try {
      const resposta = await fetch("/api/telefone/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone }),
      });
      const dados = (await resposta.json()) as { erro?: string; canal?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível enviar o código agora.");
        setStatus("erro");
        return;
      }
      setCanal(dados.canal ?? null);
      setStatus("idle");
      iniciarCooldown();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("erro");
    }
  }

  useEffect(() => {
    if (jaEnviou.current) return;
    jaEnviou.current = true;
    enviar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmar(e?: React.FormEvent) {
    e?.preventDefault();
    if (codigo.trim().length < 6) {
      setErro("Digite o código completo que enviamos.");
      setStatus("erro");
      return;
    }
    setStatus("verificando");
    setErro(null);

    try {
      const resposta = await fetch("/api/telefone/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codigo.trim() }),
      });
      const dados = (await resposta.json()) as { erro?: string };
      if (!resposta.ok) {
        setErro(dados.erro ?? "Não foi possível confirmar. Tente de novo.");
        setStatus("erro");
        return;
      }
      onVerificado();
    } catch {
      setErro("Sem conexão no momento. Tente de novo.");
      setStatus("erro");
    }
  }

  return (
    // Div, não <form> — este componente às vezes é encaixado dentro do
    // form de uma tela maior (ex. editar-perfil); <form> dentro de
    // <form> é inválido em HTML e o navegador acaba disparando o
    // submit do form de FORA em vez do botão daqui.
    <div className="mt-16" style={{ textAlign: "left" }}>
      <p className="hint" style={{ marginBottom: 8 }}>
        {status === "enviando" && !canal
          ? "Enviando código…"
          : canal
            ? `Enviamos um código por ${CANAL_LABEL[canal] ?? canal} para ${telefone}.`
            : `Confirme o número ${telefone}.`}
      </p>
      <div className="field">
        <label htmlFor="codigo-confirmacao-telefone">Código de verificação</label>
        <input
          id="codigo-confirmacao-telefone"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Código"
          maxLength={6}
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.replace(/\D/g, ""));
            setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              confirmar();
            }
          }}
          style={{ textAlign: "center", fontSize: 24, letterSpacing: 4 }}
          required
        />
        {erro && (
          <p className="hint" style={{ color: "var(--coral)" }}>
            {erro}
          </p>
        )}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => confirmar()}
        disabled={status === "verificando" || status === "enviando"}
      >
        {status === "verificando" ? "Confirmando…" : "Confirmar código"}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block mt-8"
        onClick={enviar}
        disabled={cooldown > 0 || status === "enviando"}
      >
        {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Não recebeu? Reenviar código"}
      </button>
      {onPular && (
        <button type="button" className="btn btn-ghost btn-block mt-8" onClick={onPular}>
          Confirmar depois
        </button>
      )}
    </div>
  );
}
