/** Uma decisão sem número pertence somente à entrega inicial legada. */
export type DecisaoDeVersao = { versaoNumero: number | null; status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' }
export function decisoesDaVersao<T extends DecisaoDeVersao>(decisoes: T[], versao: number): T[] {
  return decisoes.filter(d => (d.versaoNumero ?? 1) === versao)
}
export function statusDaVersao(decisoes: DecisaoDeVersao[], versao: number): 'SEM_DECISAO' | 'EM_ANALISE' | 'APROVADO' | 'REJEITADO' {
  const atuais = decisoesDaVersao(decisoes, versao)
  if (atuais.some(d => d.status === 'REJEITADO')) return 'REJEITADO'
  if (atuais.length && atuais.every(d => d.status === 'APROVADO')) return 'APROVADO'
  return atuais.length ? 'EM_ANALISE' : 'SEM_DECISAO'
}
