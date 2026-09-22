import { describe, it, expect } from 'vitest'
import { oQueSePerdeAoExcluir, formatPapel } from '@/lib/equipes'

/*
 * O `confirm()` do navegador dizia só "Esta ação é irreversível" — e os dois
 * números que ele omitia estavam desenhados ao lado do botão. Conferido no app
 * antes do conserto: excluir uma equipe com 1 membro e 1 projeto devolveu 200,
 * apagou o vínculo do membro e deixou o projeto com `equipeId: null`.
 */
describe('O que a exclusão de uma equipe leva junto', () => {
  it('conta os membros que perdem acesso', () => {
    expect(oQueSePerdeAoExcluir(3, 0)).toContain('3 membros perdem o acesso')
  })

  it('conta os projetos que deixam de pertencer a ela', () => {
    expect(oQueSePerdeAoExcluir(0, 2)).toContain('2 projetos deixam de pertencer')
  })

  it('diz as duas coisas quando as duas acontecem', () => {
    const frase = oQueSePerdeAoExcluir(2, 3)
    expect(frase).toContain('2 membros')
    expect(frase).toContain('3 projetos')
  })

  /*
   * Dizer que o projeto sobrevive importa tanto quanto dizer o que some: quem
   * hesita diante de "irreversível" precisa saber que não vai perder trabalho.
   */
  it('tranquiliza sobre o trabalho quando há projetos em jogo', () => {
    expect(oQueSePerdeAoExcluir(1, 1)).toMatch(/Nenhum projeto é apagado/)
  })

  it('não promete nada sobre projetos quando não há nenhum', () => {
    expect(oQueSePerdeAoExcluir(2, 0)).not.toMatch(/Nenhum projeto é apagado/)
  })

  /* Equipe vazia não precisa de aviso dramático — é o caso em que excluir
     realmente não custa nada. */
  it('diz que excluir uma equipe vazia não afeta ninguém', () => {
    expect(oQueSePerdeAoExcluir(0, 0)).toMatch(/vazia/)
    expect(oQueSePerdeAoExcluir(0, 0)).not.toMatch(/irreversível|Não dá para desfazer/)
  })

  it('usa singular quando é um só', () => {
    const frase = oQueSePerdeAoExcluir(1, 1)
    expect(frase).toContain('1 membro perde')
    expect(frase).toContain('1 projeto deixa')
  })
})

describe('Os papéis em português', () => {
  it('traduz os quatro', () => {
    expect(formatPapel('LIDER')).toBe('Líder')
    expect(formatPapel('DESIGNER')).toBe('Designer')
    expect(formatPapel('REVISOR')).toBe('Revisor')
    expect(formatPapel('CLIENTE')).toBe('Cliente')
  })
})
