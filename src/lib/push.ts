import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

// Notificação push (Web Push) — pedido do usuário pra o corretor saber
// NA HORA de agendamento/cancelamento/resposta do cliente, sem
// precisar abrir o painel. Mesmo padrão opcional do resend.ts: sem as
// chaves VAPID, pushConfigurado() devolve false e ninguém tenta
// mandar, nenhuma rota quebra.
export function pushConfigurado(): boolean {
  return Boolean(process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

let configurado = false;
function configurarUmaVez() {
  if (configurado || !pushConfigurado()) return;
  webpush.setVapidDetails(
    "mailto:contato@redeimpulso.com.br",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configurado = true;
}

type Payload = { titulo: string; corpo: string; url?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- aceita tanto o cliente de sessão (SSR) quanto o admin (service role, chamado de webhooks sem sessão)
export async function enviarPushParaCorretor(supabase: SupabaseClient<any>, corretorId: string, payload: Payload) {
  if (!pushConfigurado()) return;
  configurarUmaVez();

  const { data: inscricoes } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", corretorId);
  if (!inscricoes || inscricoes.length === 0) return;

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          JSON.stringify(payload),
        );
      } catch (erro) {
        // 404/410 = inscrição morta (usuário desinstalou, limpou dados do
        // navegador, etc.) — apaga em vez de ficar tentando pra sempre.
        const status = (erro as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", inscricao.id);
        } else {
          console.error("[push] falha ao enviar:", erro);
        }
      }
    }),
  );
}
