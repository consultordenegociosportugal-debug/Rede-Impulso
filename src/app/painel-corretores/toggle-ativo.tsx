"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export function ToggleAtivo({ profileId, ativo }: { profileId: string; ativo: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  async function handleClick() {
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("corretor_perfis")
      .update({ ativo: !ativo })
      .eq("profile_id", profileId);
    setSalvando(false);
    if (!error) router.refresh();
  }

  return (
    <button
      type="button"
      className={`${styles.switch} ${ativo ? "" : styles.switchOff}`}
      onClick={handleClick}
      disabled={salvando}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
    >
      <span className={styles.track} />
      {ativo ? "Ativo" : "Inativo"}
    </button>
  );
}
