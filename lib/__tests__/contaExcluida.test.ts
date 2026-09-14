import { describe, it, expect } from 'vitest'
import { contaExcluida, resumoDaContaExcluida, type UsuarioAdmin } from '../admin'

function u(extra: Partial<UsuarioAdmin> = {}): UsuarioAdmin {
  return {
    id: 'c1',
    nome: 'João Santos',
    email: 'joao@empresa.com',
    tipo: 'CLIENTE',
    ativo: true,
    ...extra,
  }
}

/**
 * Depois da anonimização sobrava `ativo: false` — que não distingue conta
 * excluída de conta desativada e não diz quando. O painel mostrava "Inativo",
 * que é a informação que não serve para nada depois de o titular pedir a
 * exclusão.
 */
describe('reconhecer uma conta excluída', () => {
  it('conta ativa não é excluída', () => {
    expect(contaExcluida(u())).toBe(false)
  })

  it('conta desativada SEM data não é excluída — são coisas diferentes', () => {
    expect(contaExcluida(u({ ativo: false }))).toBe(false)
  })

  it('a data é o que define', () => {
    expect(contaExcluida(u({ ativo: false, excluidoEm: '2026-09-13T10:00:00.000Z' }))).toBe(true)
  })
})

describe('o que o painel diz sobre uma conta excluída', () => {
  it('conta o que ficou vinculado e por quê', () => {
    const frase = resumoDaContaExcluida(
      u({ _count: { projetosDesigner: 2, projetosCliente: 1, artes: 5 } }),
    )
    expect(frase).toContain('3 projetos')
    expect(frase).toContain('5 artes')
    expect(frase).toMatch(/obrigação fiscal/i)
  })

  it('soma os projetos dos dois lados — a pessoa pode ter sido designer e cliente', () => {
    const frase = resumoDaContaExcluida(
      u({ _count: { projetosDesigner: 1, projetosCliente: 1, artes: 0 } }),
    )
    expect(frase).toContain('2 projetos')
  })

  it('singular quando é um só', () => {
    const frase = resumoDaContaExcluida(
      u({ _count: { projetosDesigner: 1, projetosCliente: 0, artes: 1 } }),
    )
    expect(frase).toContain('1 projeto e 1 arte')
    expect(frase).not.toContain('1 projetos')
  })

  it('sem nada vinculado, diz isso em vez de uma frase vazia', () => {
    const frase = resumoDaContaExcluida(u({ _count: { projetosDesigner: 0, projetosCliente: 0, artes: 0 } }))
    expect(frase).toBe('Nenhum registro vinculado.')
  })

  it('sem a contagem, não quebra nem inventa número', () => {
    expect(resumoDaContaExcluida(u())).toBe('Nenhum registro vinculado.')
  })

  it('nunca devolve "undefined" ou "NaN" na cara do admin', () => {
    const casos = [u(), u({ _count: { projetosDesigner: 3, projetosCliente: 0, artes: 0 } })]
    for (const caso of casos) {
      expect(resumoDaContaExcluida(caso)).not.toMatch(/undefined|NaN|null/)
    }
  })
})
