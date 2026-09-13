import { describe, it, expect } from 'vitest'
import { frasedeQuemFalta, hashCurto, ROTULO_PAPEL, type PapelContrato } from '../contrato'

/**
 * O que a tela diz sobre o contrato.
 *
 * Duas coisas travadas aqui: que nenhuma constante de banco vaze para a frase,
 * e que o hash apareça de forma conferível. O hash não é enfeite — é a prova de
 * que o texto não mudou desde o aceite.
 */

describe('de quem se está esperando', () => {
  it('ninguém faltando não vira frase', () => {
    expect(frasedeQuemFalta([])).toBe('')
  })

  it('um papel sai no singular', () => {
    expect(frasedeQuemFalta(['CLIENTE'])).toBe('Falta o cliente aceitar.')
    expect(frasedeQuemFalta(['DESIGNER'])).toBe('Falta o designer aceitar.')
  })

  it('os dois saem no plural, sem repetir "falta"', () => {
    expect(frasedeQuemFalta(['DESIGNER', 'CLIENTE'])).toBe(
      'Faltam o designer e o cliente aceitarem.',
    )
  })

  it('nenhuma constante de banco aparece na frase', () => {
    // `DESIGNER` em caixa alta na tela é o mesmo defeito de mostrar
    // `EM_ANALISE` ao cliente ou o CUID no lugar do nome.
    const papeis: PapelContrato[] = ['DESIGNER', 'CLIENTE']
    for (const p of papeis) {
      expect(frasedeQuemFalta([p])).not.toContain(p)
    }
    expect(frasedeQuemFalta(papeis)).not.toMatch(/[A-Z]{4,}/)
  })

  it('todo papel tem rótulo', () => {
    const papeis: PapelContrato[] = ['DESIGNER', 'CLIENTE']
    for (const p of papeis) {
      expect(ROTULO_PAPEL[p]).toBeTruthy()
      expect(frasedeQuemFalta([p])).not.toContain('undefined')
    }
  })
})

describe('o hash na tela', () => {
  const HASH = '619d53f1729ae6480a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef'

  it('mostra doze caracteres — o bastante para conferir de relance', () => {
    expect(hashCurto(HASH)).toBe('619d53f1729a')
    expect(hashCurto(HASH)).toHaveLength(12)
  })

  it('o prefixo é do hash de verdade, não uma reescrita', () => {
    // Se a tela mostrasse algo derivado, conferir contra o contrato seria
    // impossível — e o hash existe justamente para ser conferido.
    expect(HASH.startsWith(hashCurto(HASH))).toBe(true)
  })

  it('hash curto demais não quebra', () => {
    expect(hashCurto('abc')).toBe('abc')
  })
})
