export type DocumentoTipo =
  | "identidade"
  | "creci"
  | "cnpj"
  | "comprovante_residencia"
  | "registro_serventia";

export const TIPOS_POR_ROLE: Record<string, DocumentoTipo[]> = {
  comprador: [],
  vendedor: ["identidade"],
  corretor: ["identidade", "creci"],
  imobiliaria: ["cnpj"],
  cartorio: ["registro_serventia"],
};
