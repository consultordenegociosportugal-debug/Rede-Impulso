const IDADE_MINIMA = 18;

// Maior data de nascimento aceitável (hoje menos 18 anos), no formato
// yyyy-mm-dd exigido pelo atributo `max` de <input type="date">.
export function dataMaximaNascimento(): string {
  const hoje = new Date();
  const limite = new Date(hoje.getFullYear() - IDADE_MINIMA, hoje.getMonth(), hoje.getDate());
  return limite.toISOString().slice(0, 10);
}

// Mesma regra do constraint `profiles_maior_idade` no banco — checa no
// cliente antes de chamar signUp()/update() para dar feedback na hora,
// mas o banco é quem garante de verdade (ver migração 0040).
export function ehMaiorDeIdade(dataNascimentoIso: string): boolean {
  if (!dataNascimentoIso) return false;
  const nascimento = new Date(dataNascimentoIso + "T00:00:00");
  if (Number.isNaN(nascimento.getTime())) return false;
  return nascimento <= new Date(dataMaximaNascimento() + "T00:00:00");
}
