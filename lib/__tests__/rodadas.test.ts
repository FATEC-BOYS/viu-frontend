import { describe, it, expect } from 'vitest'
import { fraseDeRodadas, passouDoCombinado, type Rodadas } from '../artes'

function r(extra: Partial<Rodadas> = {}): Rodadas {
  return { usadas: 1, incluidas: 3, semVersao: 0, versoes: [1], ...extra }
}

/**
 * A cláusula 3.2 estava combinada, gravada e invisível: `rodadasIncluidas` no
 * contrato, `versaoNumero` em cada feedback, e nenhuma tela dizendo em qual
 * rodada o projeto está. Metade do valor da cláusula ficava num PDF que
 * ninguém abre.
 */
describe('a frase das rodadas', () => {
  it('diz quantas de quantas quando há acordo', () => {
    expect(fraseDeRodadas(r({ usadas: 2 }))).toBe('2 de 3 rodadas usadas')
  })

  it('sem acordo, conta o usado e não inventa um teto', () => {
    // Inventar um limite seria o VIU decidindo a cláusula no lugar das partes.
    expect(fraseDeRodadas(r({ usadas: 2, incluidas: null }))).toBe('2 rodadas usadas')
  })

  it('uma rodada sai no singular', () => {
    expect(fraseDeRodadas(r({ usadas: 1, incluidas: null }))).toBe('1 rodada usada')
  })

  it('zero usadas continua legível', () => {
    expect(fraseDeRodadas(r({ usadas: 0, versoes: [] }))).toBe('0 de 3 rodadas usadas')
  })

  it('"nenhuma revisão inclusa" é acordo, e a frase respeita isso', () => {
    // 0 é combinável — e aí a primeira rodada já é extra, pela 3.3.
    expect(fraseDeRodadas(r({ usadas: 1, incluidas: 0 }))).toBe('1 de 0 rodadas usadas')
  })

  it('substantivo e particípio concordam entre si, sempre', () => {
    /*
     * A primeira versão pluralizava "rodada" pelo total e "usada" pelo usado, e
     * os dois discordavam quando um era 1 e o outro não: "1 de 0 rodadas
     * usada". Percorrer as combinações é o que pega isso.
     */
    const combinacoes: Rodadas[] = []
    for (const usadas of [0, 1, 2, 5]) {
      for (const incluidas of [null, 0, 1, 3]) {
        combinacoes.push(r({ usadas, incluidas, versoes: [] }))
      }
    }
    for (const caso of combinacoes) {
      const frase = fraseDeRodadas(caso)
      const singular = /\brodada\b/.test(frase)
      const usadaSingular = /\busada\b/.test(frase)
      expect(singular, frase).toBe(usadaSingular)
    }
  })

  it('nunca devolve "null" ou "undefined" na cara do designer', () => {
    const casos = [r(), r({ incluidas: null }), r({ usadas: 0, versoes: [] })]
    for (const caso of casos) {
      expect(fraseDeRodadas(caso)).not.toMatch(/null|undefined|NaN/)
    }
  })
})

describe('passar do combinado', () => {
  it('a quarta de três passou', () => {
    expect(passouDoCombinado(r({ usadas: 4, incluidas: 3 }))).toBe(true)
  })

  it('a terceira de três não passou — o limite é inclusivo', () => {
    expect(passouDoCombinado(r({ usadas: 3, incluidas: 3 }))).toBe(false)
  })

  it('sem acordo nada passa — não há linha para cruzar', () => {
    expect(passouDoCombinado(r({ usadas: 9, incluidas: null }))).toBe(false)
  })

  it('a primeira já passa quando o acordo foi nenhuma', () => {
    expect(passouDoCombinado(r({ usadas: 1, incluidas: 0 }))).toBe(true)
  })
})
