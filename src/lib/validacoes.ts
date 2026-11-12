// Validação por dígito verificador (algoritmo oficial da Receita Federal)
// — detecta na hora um número digitado errado, sem precisar consultar
// nenhum serviço externo. Não confirma que o CPF/CNPJ existe de verdade,
// só que os dígitos batem matematicamente.

export function cpfValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;

  for (const posicaoFinal of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < posicaoFinal; i++) {
      soma += Number(digitos[i]) * (posicaoFinal + 1 - i);
    }
    const resto = (soma * 10) % 11;
    const digitoEsperado = resto === 10 ? 0 : resto;
    if (digitoEsperado !== Number(digitos[posicaoFinal])) return false;
  }

  return true;
}

export function cnpjValido(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  function calcularDigito(base: string, pesos: number[]): number {
    const soma = pesos.reduce((acc, peso, i) => acc + peso * Number(base[i]), 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  }

  const digito1 = calcularDigito(digitos.slice(0, 12), pesos1);
  if (digito1 !== Number(digitos[12])) return false;

  const digito2 = calcularDigito(digitos.slice(0, 13), pesos2);
  if (digito2 !== Number(digitos[13])) return false;

  return true;
}

const UFS_VALIDAS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

// Formato do CRECI (já normalizado por formatarCreci, em src/lib/mascaras.ts):
// de 3 a 6 dígitos, hífen, e a sigla de um estado que existe de verdade —
// sem isso, "123-XX" passava pela checagem antiga (só exigia 3 dígitos
// em qualquer lugar).
export function creciValido(valor: string): boolean {
  const normalizado = valor.toUpperCase().trim();
  const match = /^(\d{3,6})-([A-Z]{2})$/.exec(normalizado);
  if (!match) return false;
  return UFS_VALIDAS.has(match[2]);
}
