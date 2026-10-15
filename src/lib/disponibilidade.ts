import type { SupabaseClient } from "@supabase/supabase-js";

// Duração fixa do slot de visita — v1 não deixa o profissional
// configurar isso, só os dias/horários em que atende (como o
// "jornada de trabalho" do passo-a-passo inicial do AppBarber).
export const DURACAO_SLOT_MINUTOS = 60;

type JanelaDia = { hora_inicio: string; hora_fim: string };

function paraMinutos(horaHHmm: string) {
  const [h, m] = horaHHmm.split(":").map(Number);
  return h * 60 + m;
}

function paraHHmm(minutos: number) {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// `data` no formato yyyy-mm-dd (horário local do navegador do usuário,
// nunca UTC — um dia de calendário é a mesma data em qualquer fuso em
// que a Rede Impulso opera hoje).
export async function horariosDisponiveis(
  supabase: SupabaseClient,
  profileId: string,
  data: string,
): Promise<{ configurado: boolean; horarios: string[] }> {
  const diaSemana = new Date(`${data}T12:00:00`).getDay();

  const { data: janelas } = await supabase
    .from("disponibilidade_semanal")
    .select("hora_inicio, hora_fim")
    .eq("profile_id", profileId)
    .eq("dia_semana", diaSemana);

  const janelasDia = (janelas ?? []) as JanelaDia[];
  if (janelasDia.length === 0) {
    return { configurado: false, horarios: [] };
  }

  const { data: ocupadas } = await supabase
    .from("visitas")
    .select("data_hora")
    .eq("corretor_id", profileId)
    .in("status", ["solicitada", "confirmada"])
    .gte("data_hora", `${data}T00:00:00`)
    .lt("data_hora", `${data}T23:59:59`);

  const horariosOcupados = new Set(
    (ocupadas ?? []).map((v) => {
      const d = new Date(v.data_hora as string);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    }),
  );

  const hoje = new Date();
  const ehHoje = data === hoje.toISOString().slice(0, 10);
  const minutoAgora = hoje.getHours() * 60 + hoje.getMinutes();

  const horarios: string[] = [];
  for (const janela of janelasDia) {
    const inicio = paraMinutos(janela.hora_inicio.slice(0, 5));
    const fim = paraMinutos(janela.hora_fim.slice(0, 5));
    for (let m = inicio; m + DURACAO_SLOT_MINUTOS <= fim; m += DURACAO_SLOT_MINUTOS) {
      if (ehHoje && m <= minutoAgora) continue;
      const hhmm = paraHHmm(m);
      if (!horariosOcupados.has(hhmm)) horarios.push(hhmm);
    }
  }

  return { configurado: true, horarios };
}
