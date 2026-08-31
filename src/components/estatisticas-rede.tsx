import { createClient } from "@/lib/supabase/server";
import styles from "./estatisticas-rede.module.css";

export async function EstatisticasRede({ align = "center" }: { align?: "center" | "start" }) {
  const supabase = await createClient();

  const [{ count: imoveisCount }, { count: corretoresCount }, { count: negociosCount }] =
    await Promise.all([
      supabase.from("imoveis").select("id", { count: "exact", head: true }).eq("status", "publicado"),
      supabase
        .from("corretor_perfis")
        .select("profile_id", { count: "exact", head: true })
        .eq("ativo", true),
      supabase.from("negocios").select("id", { count: "exact", head: true }).eq("status", "concluido"),
    ]);

  const stats = [
    { valor: imoveisCount ?? 0, label: "imóveis publicados" },
    { valor: corretoresCount ?? 0, label: "corretores ativos" },
    { valor: negociosCount ?? 0, label: "negócios fechados" },
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
