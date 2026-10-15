/** Piloto de revisão: módulos comerciais ficam disponíveis somente ao ADM. */
export function podeVerFinanceiro(tipo?: string | null): boolean {
  return tipo === 'ADMIN'
}

export function rotaFinanceira(pathname: string): boolean {
  return ['/planos', '/assinaturas', '/faturas', '/saques', '/extrato', '/disputas', '/pagamento', '/contratos'].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  )
}
