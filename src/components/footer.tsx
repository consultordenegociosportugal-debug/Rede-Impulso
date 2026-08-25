import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", alignItems: "center" }}>
        <span>Rede Impulso — protótipo de produto para uso interno.</span>
        <span style={{ display: "flex", gap: 16 }}>
          <Link href="/termos-de-uso" style={{ textDecoration: "underline" }}>
            Termos de Uso
          </Link>
          <Link href="/privacidade" style={{ textDecoration: "underline" }}>
            Política de Privacidade
          </Link>
        </span>
      </div>
    </footer>
  );
}
