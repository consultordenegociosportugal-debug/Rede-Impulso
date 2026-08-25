export function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  let saida = "";
  if (digitos.length > 0) saida += "(" + digitos.slice(0, 2);
  if (digitos.length >= 2) saida += ") ";
  if (digitos.length > 2) saida += digitos.slice(2, 3);
  if (digitos.length > 3) saida += " " + digitos.slice(3, 7);
  if (digitos.length > 7) saida += "-" + digitos.slice(7, 11);
  return saida;
}

export function formatarCreci(valor: string) {
  const limpo = valor.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const digitos = limpo.replace(/[^0-9]/g, "").slice(0, 6);
  const letras = limpo.replace(/[^A-Z]/g, "").slice(0, 2);
  return letras ? `${digitos}-${letras}` : digitos;
}

export function formatarInstagram(valor: string) {
  const semEspacos = valor.replace(/\s/g, "");
  const umArroba = semEspacos.replace(/@/g, (match, offset) => (offset === 0 ? "@" : ""));
  return umArroba.replace(/[^@a-zA-Z0-9._]/g, "");
}

export function formatarCnpj(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  let saida = "";
  if (digitos.length > 0) saida += digitos.slice(0, 2);
  if (digitos.length > 2) saida += "." + digitos.slice(2, 5);
  if (digitos.length > 5) saida += "." + digitos.slice(5, 8);
  if (digitos.length > 8) saida += "/" + digitos.slice(8, 12);
  if (digitos.length > 12) saida += "-" + digitos.slice(12, 14);
  return saida;
}
