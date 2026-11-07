// Qualquer nome vindo de cadastro (cliente, corretor, cliente avulso)
// cai direto dentro de um template literal de HTML de e-mail — sem
// escapar, alguém cadastrando o nome "<a href=https://golpe>clique
// aqui</a>" injetava um link disfarçado de verdade num e-mail real da
// Rede Impulso, mandado pra outra pessoa (cliente, corretor, gestor, a
// cópia que vai pro e-mail do próprio dono). Use sempre que um valor
// que não veio do próprio código (nome, motivo, observação) entrar
// num template de e-mail.
export function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
