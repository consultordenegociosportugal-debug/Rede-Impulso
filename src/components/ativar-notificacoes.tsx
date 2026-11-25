"use client";

import { useEffect, useState } from "react";

type Status = "verificando" | "nao_suportado" | "inativo" | "ativando" | "ativo" | "negado" | "erro";

// Converte a chave pública VAPID (base64url) pro formato Uint8Array que
// pushManager.subscribe() exige — não tem uma API do browser pra isso.
function paraUint8Array(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(base64);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

// Botão único pra ativar/desativar notificação push (ver migração 0100,
// src/lib/push.ts, public/sw.js) — pra o corretor saber na hora de
// agendamento/cancelamento/resposta do cliente sem abrir o painel.
// Nunca pede permissão sozinho: só quando o corretor clica.
export function AtivarNotificacoes() {
  const [status, setStatus] = useState<Status>("verificando");

  useEffect(() => {
    async function verificar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("nao_suportado");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("nao_suportado");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("negado");
        return;
      }
      const registro = await navigator.serviceWorker.ready;
      const inscricaoAtual = await registro.pushManager.getSubscription();
      setStatus(inscricaoAtual ? "ativo" : "inativo");
    }
    verificar().catch(() => setStatus("erro"));
  }, []);

  async function ativar() {
    setStatus("ativando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setStatus(permissao === "denied" ? "negado" : "inativo");
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: paraUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as BufferSource,
      });

      const resposta = await fetch("/api/push/inscrever", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inscricao.toJSON()),
      });
      if (!resposta.ok) {
        setStatus("erro");
        return;
      }
      setStatus("ativo");
    } catch {
      setStatus("erro");
    }
  }

  async function desativar() {
    setStatus("ativando");
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();
      if (inscricao) {
        await fetch("/api/push/desinscrever", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: inscricao.endpoint }),
        });
        await inscricao.unsubscribe();
      }
      setStatus("inativo");
    } catch {
      setStatus("erro");
    }
  }

  if (status === "verificando" || status === "nao_suportado") return null;

  if (status === "negado") {
    return (
      <p className="hint" style={{ margin: 0 }}>
        🔕 Notificações bloqueadas pelo navegador — pra ativar, libere nas configurações de site.
      </p>
    );
  }

  if (status === "ativo") {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={desativar}>
        🔔 Notificações ativadas
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn btn-outline btn-sm"
      onClick={ativar}
      disabled={status === "ativando"}
    >
      {status === "ativando" ? "Ativando…" : status === "erro" ? "Tentar de novo" : "🔔 Ativar notificações"}
    </button>
  );
}
