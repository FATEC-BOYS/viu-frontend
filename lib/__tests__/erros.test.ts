import { describe, it, expect } from 'vitest'
import { ehEmailNaoVerificado, rotaDeVerificacao } from '../erros'

/**
 * A distinção existe para a tela: "isto não é seu" é beco sem saída, "confirme
 * seu e-mail" tem próximo passo. Quem decide é o `codigo` do corpo — a
 * mensagem muda com a redação e não serve de contrato.
 */
describe('ehEmailNaoVerificado', () => {
  it('reconhece o 403 de verificação pelo código', () => {
    expect(ehEmailNaoVerificado({ status: 403, body: { codigo: 'EMAIL_NAO_VERIFICADO' } })).toBe(true)
  })

  it('não confunde com um 403 de permissão', () => {
    expect(ehEmailNaoVerificado({ status: 403, body: { message: 'Acesso negado' } })).toBe(false)
  })

  it('aguenta erro sem corpo, nulo ou de rede', () => {
    expect(ehEmailNaoVerificado(new Error('falha de rede'))).toBe(false)
    expect(ehEmailNaoVerificado(null)).toBe(false)
    expect(ehEmailNaoVerificado(undefined)).toBe(false)
  })
})

describe('rotaDeVerificacao', () => {
  it('leva o e-mail para a tela poder dizer para onde o link foi', () => {
    expect(rotaDeVerificacao('joao+teste@empresa.com')).toBe(
      '/verificar-email?email=joao%2Bteste%40empresa.com',
    )
  })

  it('sem e-mail, ainda leva para a tela', () => {
    expect(rotaDeVerificacao(null)).toBe('/verificar-email')
  })
})
