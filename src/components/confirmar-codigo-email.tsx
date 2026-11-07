"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SEGUNDOS = 30;

/**
 * Tela de código (OTP) pós-cadastro. Depende do template "Confirm signup"
 * no Supabase estar configurado para enviar {{ .Token }} em vez de só o
 * link — ver instruções dadas ao dono do projeto.
 */
export function ConfirmarCodigoEmail({
  email,
  onVerificado,
}: {
  email: string;
  onVerificado: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<"idle" | "verificando" | "erro">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [reenviado, setReenviado] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (codigo.trim().length < 6) {
      setErro("Digite o código completo que enviamos por e-mail.");
      setStatus("erro");
      return;
    }
    setStatus("verificando");
    setErro(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo.trim(),
      type: "signup",
    });

    if (error) {
      const m = error.message.toLowerCase();
      setErro(
        m.includes("expired") || m.includes("invalid")
          ? "Código inválido ou expirado. Confira ou peça um novo."
          : "Não foi possível confirmar. Tente de novo.",
      );
      setStatus("erro");
      return;
    }

    onVerificado();
  }

  async function reenviar() {
    if (cooldown > 0) return;
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setErro("Não foi possível reenviar o código agora. Tente de novo em instantes.");
      setStatus("erro");
      return;
    }
    setReenviado(true);
    iniciarCooldown();
  }

  return (
    <form onSubmit={confirmar} className="mt-16" style={{ textAlign: "left" }}>
      <div className="field">
        <label htmlFor="codigo-confirmacao">Código de confirmação</label>
        <input
          id="codigo-confirmacao"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Código"
          maxLength={12}
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value.replace(/\D/g, ""));
            setErro(null);
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
        type="submit"
        className="btn btn-primary btn-block"
        disabled={status === "verificando"}
      >
        {status === "verificando" ? "Confirmando…" : "Confirmar código"}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-block mt-8"
        onClick={reenviar}
        disabled={cooldown > 0}
      >
        {cooldown > 0
          ? `Reenviar código (${cooldown}s)`
          : reenviado
            ? "Reenviar código"
            : "Não recebeu? Reenviar código"}
      </button>
    </form>
  );
}
