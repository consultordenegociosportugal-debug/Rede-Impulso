import { createClient } from "@/lib/supabase/server";
import styles from "./estatisticas-rede.module.css";

export async function EstatisticasRede({ align = "center" }: { align?: "center" | "start" }) {
  const supabase = await createClient();

  const [{ count: corretoresCount }, { count: visitasCount }, { count: realizadasCount }] =
    await Promise.all([
      supabase
        .from("corretor_perfis")
        .select("profile_id", { count: "exact", head: true })
        .eq("ativo", true),
      supabase.from("visitas").select("id", { count: "exact", head: true }),
      supabase
        .from("visitas")
        .select("id", { count: "exact", head: true })
        .eq("status", "realizada"),
    ]);

  const stats = [
    { valor: corretoresCount ?? 0, label: "corretores ativos" },
    { valor: visitasCount ?? 0, label: "visitas agendadas" },
    { valor: realizadasCount ?? 0, label: "visitas realizadas" },
  ];

  if (stats.every((s) => s.valor === 0)) return null;

  return (
    <div
      className={styles.linha}
      style={{ justifyContent: align === "start" ? "flex-start" : "center" }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={styles.item}
          style={{ textAlign: align === "start" ? "left" : "center" }}
        >
          <div className={styles.numero}>{s.valor.toLocaleString("pt-BR")}</div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
