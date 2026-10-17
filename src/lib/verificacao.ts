export type DocumentoTipo = "identidade" | "creci";

export const TIPOS_POR_ROLE: Record<string, DocumentoTipo[]> = {
  comprador: [],
  corretor: ["identidade", "creci"],
  gestor: [],
};
