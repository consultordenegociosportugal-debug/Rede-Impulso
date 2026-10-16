import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Destino das rotas de um módulo adormecido (marketplace de imóveis,
// motorista ou elétricos — ver src/lib/modulos.ts).
export default function PausadoPage() {
  return (
    <>
      <Nav active="" />

      <div className="wrap" style={{ paddingTop: 64, paddingBottom: 96 }}>
        <div className="card" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", padding: "40px 24px" }}>
          <span className="badge badge-amber">Em pausa</span>
          <h1 style={{ fontSize: 24, margin: "12px 0 8px" }}>Esta área está em pausa</h1>
          <p className="muted" style={{ margin: 0 }}>
            A Rede Impulso agora é focada em agendamento direto entre você e seu
            corretor. Esta área está temporariamente fora do ar; seus dados continuam
            guardados.
          </p>
          <div className="flex gap-8 mt-24" style={{ justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/" className="btn btn-primary btn-sm">
              Conhecer a Rede Impulso
            </Link>
            <Link href="/buscar-profissionais" className="btn btn-outline btn-sm">
              Buscar um corretor
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
