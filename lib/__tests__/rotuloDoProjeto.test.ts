import { describe, it, expect } from 'vitest'
import { rotuloColunaDoProjeto, rotuloProjeto } from '../rotulos'
import { statusLabel } from '@/components/projetos/types'

/**
 * Um status, uma palavra.
 *
 * Eram QUATRO mapas de rótulo de projeto no front, e eles discordavam:
 *
 *   lib/rotulos                     CONCLUIDO → "Fechado"
 *   components/projetos/types       CONCLUIDO → "Concluído"
 *   BoardView (títulos das colunas) CONCLUIDO → "Concluído"
 *   PainelDoCliente                 CONCLUIDO → "Concluído", e SEM RASCUNHO
 *
 * Então o mesmo projeto era "Concluído" no cartão da lista e "Fechado" na
 * própria tela dele. E o quarto mapa, sem RASCUNHO, caía num `?? p.status`:
 * o cliente que ainda não aceitou o convite via "RASCUNHO" em caixa alta.
 *
 * A palavra escolhida é "Concluído". Estes testes seguram o acordo entre as
 * funções que sobraram — contra o código antigo, o primeiro falha comparando
 * "Fechado" com "Concluído".
 */
describe('o rótulo do status do projeto', () => {
  it('é o mesmo no cartão e na tela do projeto', () => {
    for (const status of ['RASCUNHO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'] as const) {
      expect(statusLabel(status)).toBe(rotuloProjeto(status))
    }
  })

  it('para CONCLUIDO é "Concluído"', () => {
    expect(rotuloProjeto('CONCLUIDO')).toBe('Concluído')
    expect(statusLabel('CONCLUIDO')).toBe('Concluído')
    expect(rotuloColunaDoProjeto('CONCLUIDO')).toBe('Concluído')
  })

  /*
   * O cabeçalho de coluna encurta só onde o rótulo é uma frase. Em todo o
   * resto ele é o mesmo texto — se divergir, voltamos a ter dois lugares onde
   * a palavra pode mudar.
   */
  it('no cabeçalho da coluna só difere no rascunho', () => {
    expect(rotuloColunaDoProjeto('RASCUNHO')).toBe('Aguardando aceite')
    for (const status of ['EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'] as const) {
      expect(rotuloColunaDoProjeto(status)).toBe(rotuloProjeto(status))
    }
  })

  /*
   * Nenhum dos cinco pode sair como o enum cru: era isso que o cliente via no
   * painel, e é o sintoma de um mapa incompleto.
   */
  it('nunca devolve o enum cru para um status que existe', () => {
    for (const status of ['RASCUNHO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'] as const) {
      expect(rotuloProjeto(status)).not.toBe(status)
      expect(rotuloColunaDoProjeto(status)).not.toBe(status)
    }
  })

  /*
   * E o contrário: status que o backend passe a mandar e ninguém traduziu sai
   * feio na tela, não some dela. É o que `traduzir` já fazia, e vale fixar —
   * um "—" no lugar esconderia a falta.
   */
  it('devolve o próprio valor quando não conhece o status', () => {
    expect(rotuloProjeto('STATUS_NOVO_DO_BACKEND')).toBe('STATUS_NOVO_DO_BACKEND')
  })
})
