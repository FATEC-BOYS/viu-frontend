import { describe, expect, it } from 'vitest'
import { decisoesDaVersao, statusDaVersao } from '../revisao'
describe('regra compartilhada das decisões por entrega', () => {
  it('aprovação anterior não decide uma versão nova', () => {
    const lista = [{ versaoNumero: 1, status: 'APROVADO' as const }]
    expect(statusDaVersao(lista, 2)).toBe('SEM_DECISAO')
    expect(statusDaVersao(lista, 1)).toBe('APROVADO')
  })
  it('decisão sem versão pertence somente à v1', () => {
    const lista = [{ versaoNumero: null, status: 'APROVADO' as const }]
    expect(decisoesDaVersao(lista, 2)).toEqual([])
    expect(statusDaVersao(lista, 1)).toBe('APROVADO')
  })
  it('recusa e pendência de versões antigas não contaminam a entrega atual', () => {
    expect(statusDaVersao([
      { versaoNumero: 1, status: 'REJEITADO' },
      { versaoNumero: 2, status: 'PENDENTE' },
      { versaoNumero: 3, status: 'APROVADO' },
    ], 3)).toBe('APROVADO')
  })
})
