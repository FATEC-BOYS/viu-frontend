import { describe, it, expect } from 'vitest'
import { frasedoDesfecho, EFEITO_DA_RESOLUCAO, type ResultadoEstorno } from '../protecao'

/**
 * A tela dizia "Disputa encerrada e o valor foi destravado" nos dois desfechos.
 *
 * Para o designer estava certo. Para o cliente era o contrário do que o backend
 * fazia — destravar devolvia a parcela ao saldo do designer justamente quando a
 * arbitragem tinha decidido contra ele. Uma frase fixa não consegue distinguir
 * os casos; por isso ela passou a sair do que o servidor respondeu.
 */
const ESTORNADO: ResultadoEstorno = { aplicado: true, viaGateway: true, valorDevolvido: 100_000 }

describe('o que a tela diz depois de resolver', () => {
  it('a favor do designer fala em liberar, não em estornar', () => {
    const frase = frasedoDesfecho('RESOLVIDA_DESIGNER', null)
    expect(frase).toContain('liberado para o saldo do designer')
    expect(frase).not.toMatch(/estorn/i)
  })

  it('escalar avisa que o dinheiro continua travado', () => {
    expect(frasedoDesfecho('ESCALADA', null)).toContain('segue travado')
  })

  it('a favor do cliente nomeia o valor devolvido e o gateway', () => {
    const frase = frasedoDesfecho('RESOLVIDA_CLIENTE', ESTORNADO)
    expect(frase).toContain('R$')
    expect(frase).toContain('1.000,00')
    expect(frase).toContain('Mercado Pago')
  })

  it('fatura fora do gateway avisa que a devolução ainda precisa ser feita', () => {
    // O caso perigoso: os livros baixam e o dinheiro não se move. Silenciar
    // isto faria a tela dizer "devolvido" sobre dinheiro parado.
    const frase = frasedoDesfecho('RESOLVIDA_CLIENTE', { ...ESTORNADO, viaGateway: false })
    expect(frase).toContain('precisa ser feita por fora')
  })

  it('disputa sem fatura não inventa um estorno que não houve', () => {
    const frase = frasedoDesfecho('RESOLVIDA_CLIENTE', null)
    expect(frase).toContain('Não havia fatura paga para estornar')
  })

  it('fatura já estornada diz isso, em vez de anunciar outra devolução', () => {
    const frase = frasedoDesfecho('RESOLVIDA_CLIENTE', { ...ESTORNADO, aplicado: false })
    expect(frase).toContain('já estava estornada')
  })

  it('nenhum desfecho devolve texto vazio', () => {
    const casos: Array<[Parameters<typeof frasedoDesfecho>[0], ResultadoEstorno | null]> = [
      ['RESOLVIDA_DESIGNER', null],
      ['RESOLVIDA_CLIENTE', null],
      ['RESOLVIDA_CLIENTE', ESTORNADO],
      ['ESCALADA', null],
    ]
    for (const [destino, estorno] of casos) {
      expect(frasedoDesfecho(destino, estorno).length).toBeGreaterThan(10)
    }
  })
})

describe('o aviso que o admin lê ANTES de confirmar', () => {
  /*
   * Este texto dizia "o produto ainda não tem estorno, então o reembolso ao
   * cliente precisa ser feito por fora". Passou a ser falso no dia em que o
   * estorno entrou, e um aviso falso num diálogo de dinheiro é pior do que
   * nenhum: ele autoriza um clique com base em algo que não vai acontecer.
   */
  it('avisa que decidir pelo cliente estorna de verdade', () => {
    expect(EFEITO_DA_RESOLUCAO.RESOLVIDA_CLIENTE).toMatch(/estorna/i)
    expect(EFEITO_DA_RESOLUCAO.RESOLVIDA_CLIENTE).not.toMatch(/ainda não tem estorno/i)
  })

  it('avisa que não dá para desfazer', () => {
    expect(EFEITO_DA_RESOLUCAO.RESOLVIDA_CLIENTE).toMatch(/não dá para desfazer/i)
  })

  it('decidir pelo designer não promete estorno nenhum', () => {
    expect(EFEITO_DA_RESOLUCAO.RESOLVIDA_DESIGNER).not.toMatch(/estorn/i)
  })
})
