import { describe, expect, it } from 'vitest'
import { podeMexerNoProjeto, podeCriarProjeto } from '@/lib/permissoesDoProjeto'

/**
 * As duas regras já divergiram entre duas telas antes de este arquivo
 * existir: a lista abria exceção para ADMIN e a tela do projeto não, então o
 * admin via "Editar" num lugar e não no outro. Estes testes seguram a regra
 * no único lugar onde ela mora agora.
 */

const DESIGNER = { id: 'u1', tipo: 'DESIGNER' }
const projetoDele = { designer: { id: 'u1' } }
const projetoDeOutro = { designer: { id: 'u2' } }

describe('podeMexerNoProjeto', () => {
  it('o designer do projeto pode', () => {
    expect(podeMexerNoProjeto(DESIGNER, projetoDele)).toBe(true)
  })

  /*
   * "O designer DO PROJETO", e não "quem tem o papel DESIGNER": a lista
   * mistura projetos, e numa equipe a mesma pessoa pode ser designer de um e
   * não de outro. A regra é por projeto.
   */
  it('o mesmo designer, no projeto de outro, não', () => {
    expect(podeMexerNoProjeto(DESIGNER, projetoDeOutro)).toBe(false)
  })

  it('o cliente não — o servidor recusa com 403', () => {
    expect(podeMexerNoProjeto({ id: 'c1', tipo: 'CLIENTE' }, projetoDele)).toBe(false)
  })

  /*
   * O servidor PERMITE admin (`requireDesignerDoProjeto` devolve cedo para
   * ADMIN). A tela não oferece mesmo assim, porque a tela do projeto nunca
   * ofereceu — e duas telas discordando sobre a mesma regra é como a
   * divergência nasce. O caminho do admin é a área dele.
   */
  it('o admin também não, embora o servidor deixasse', () => {
    expect(podeMexerNoProjeto({ id: 'a1', tipo: 'ADMIN' }, projetoDele)).toBe(false)
  })

  it('sem sessão, nada', () => {
    expect(podeMexerNoProjeto(null, projetoDele)).toBe(false)
  })

  it('projeto sem designer não libera ninguém', () => {
    expect(podeMexerNoProjeto(DESIGNER, { designer: null })).toBe(false)
    expect(podeMexerNoProjeto(DESIGNER, null)).toBe(false)
  })
})

describe('podeCriarProjeto', () => {
  it('designer e admin podem', () => {
    expect(podeCriarProjeto(DESIGNER)).toBe(true)
    expect(podeCriarProjeto({ id: 'a1', tipo: 'ADMIN' })).toBe(true)
  })

  /*
   * O backend recusa com "Clientes só podem criar projetos onde são o
   * cliente": quem abre trabalho é quem foi contratado. Esta regra tranca as
   * QUATRO portas do modal de criação — o botão do cabeçalho, `?novo=1`, o
   * estado vazio e o "+" do calendário —, porque quem a consulta é a função
   * de abertura, não cada gatilho.
   */
  it('o cliente não', () => {
    expect(podeCriarProjeto({ id: 'c1', tipo: 'CLIENTE' })).toBe(false)
  })

  it('sem sessão carregada, também não — no escuro não se oferece', () => {
    expect(podeCriarProjeto(null)).toBe(false)
  })
})
