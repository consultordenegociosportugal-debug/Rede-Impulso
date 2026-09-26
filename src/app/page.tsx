import { IMOBILIARIO_ATIVO } from "@/lib/modulos";
import { HomeImobiliaria } from "./home-imobiliaria";
import { HomeMotorista } from "./home-motorista";

export default async function Home() {
  return IMOBILIARIO_ATIVO ? <HomeImobiliaria /> : <HomeMotorista />;
}
