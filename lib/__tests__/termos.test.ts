import { describe, it, expect } from 'vitest'
import { frasedoQueFalta, ROTULO_CAMPO, type CampoTermo } from '../termos'

/**
 * A tela precisa dizer o que falta em português.
 *
 * Sem isto ela mostraria `licencaTerritorio` para o designer — que é o mesmo
 * defeito de mostrar o CUID no lugar do nome, ou `EM_ANALISE` gritado no
 * viewer: nome de coluna é do banco, não da pessoa.
 */
describe('a frase do que falta combinar', () => {
  it('nada faltando não vira frase', () => {
    expect(frasedoQueFalta([])).toBe('')
  })

  it('um campo sai sozinho, sem vírgula nem "e"', () => {
    expect(frasedoQueFalta(['licencaTerritorio'])).toBe('território da licença')
  })

  it('dois campos ligam com "e", não com vírgula', () => {
    expect(frasedoQueFalta(['licencaTerritorio', 'exclusividade'])).toBe(
      'território da licença e exclusividade',
    )
  })

  it('três ou mais usam vírgula até o último', () => {
    expect(frasedoQueFalta(['rodadasIncluidas', 'licencaTerritorio', 'exclusividade'])).toBe(
      'rodadas de revisão por entrega, território da licença e exclusividade',
    )
  })

  it('nenhum identificador de banco vaza para a frase', () => {
    /*
     * A asserção olha camelCase, e não "o campo não aparece": `exclusividade`
     * é o nome da coluna E a palavra certa em português, então proibir o nome
     * cru reprovaria o rótulo correto. O que não pode vazar é
     * `licencaTerritorio`, `rodadasIncluidas` — identificador, não palavra.
     */
    const frase = frasedoQueFalta(Object.keys(ROTULO_CAMPO) as CampoTermo[])
    expect(frase).not.toMatch(/[a-z][A-Z]/)
  })

  /*
   * O backend manda `faltam` pronto e a tela só traduz. Se traduzisse uma
   * chave que não conhece, o designer leria "undefined" — pior que o nome da
   * coluna. Este teste trava o acoplamento: todo campo que o serviço pode
   * devolver precisa ter rótulo aqui.
   */
  it('todo campo obrigatório tem rótulo', () => {
    const esperados: CampoTermo[] = [
      'rodadasIncluidas',
      'prazoRevisaoDiasUteis',
      'licencaFinalidade',
      'licencaTerritorio',
      'licencaPrazo',
      'exclusividade',
      'arquivosFonte',
    ]
    for (const campo of esperados) {
      expect(ROTULO_CAMPO[campo]).toBeTruthy()
      expect(frasedoQueFalta([campo])).not.toContain('undefined')
    }
  })
})
