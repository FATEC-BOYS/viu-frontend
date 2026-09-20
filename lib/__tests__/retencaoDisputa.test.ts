import { describe, it, expect } from 'vitest'
import { frasedaRetencao, rotuloDoStatusDaFatura } from '@/lib/protecao'
import type { Fatura } from '@/lib/pagamentos'

function fatura(extra: Partial<Fatura> = {}): Fatura {
  return {
    id: 'fat1',
    valor: 1200000,
    valorFormatado: 'R$ 12.000,00',
    valorLiquidoDesignerFormatado: 'R$ 10.800,00',
    status: 'PAGA',
    projeto: { id: 'proj1', nome: 'Rebranding Acme' },
    cliente: { id: 'cliente1', nome: 'João' },
    designer: { id: 'designer1', nome: 'Ana' },
    ...extra,
  } as Fatura
}

/*
 * O efeito dito antes do clique. O modal abria uma disputa sem perguntar qual
 * fatura estava em jogo — e, por isso, sem reter nada. Agora que a escolha
 * retém dinheiro de verdade, a frase embaixo do seletor é o único lugar onde
 * isso é avisado.
 */
describe('A frase do que fica retido', () => {
  it('mostra o líquido para o designer, que é de quem o valor sai', () => {
    expect(frasedaRetencao(fatura(), false)).toContain('R$ 10.800,00')
  })

  /*
   * O servidor remove `valorLiquidoDesigner` da resposta do cliente de
   * propósito — quem paga não lê quanto o VIU cobra nem quanto o designer
   * embolsa. A frase conta o efeito sem inventar o número a partir do total.
   */
  it('conta o efeito ao cliente sem revelar o repasse', () => {
    const frase = frasedaRetencao(fatura(), true)
    expect(frase).toContain('fica retido')
    expect(frase).not.toContain('10.800')
    expect(frase).not.toContain('12.000')
  })

  it('não promete retenção sobre fatura que ninguém pagou', () => {
    expect(frasedaRetencao(fatura({ status: 'PENDENTE' }), false)).toContain('não foi paga')
    // A regra é a mesma do servidor: só fatura PAGA entra na soma do saldo.
    expect(frasedaRetencao(fatura({ status: 'PENDENTE' }), false)).not.toContain('10.800')
  })

  it('diz claramente que nada fica retido quando não há fatura escolhida', () => {
    expect(frasedaRetencao(null, false)).toContain('Nenhum valor fica retido')
  })

  /*
   * Designer cujo repasse não veio na resposta: dizer um valor que não se tem
   * seria pior do que descrever o efeito.
   */
  it('descreve o efeito sem número quando o repasse não veio', () => {
    const frase = frasedaRetencao(fatura({ valorLiquidoDesignerFormatado: undefined }), false)
    expect(frase).toContain('fica retido')
  })
})

describe('O estado da fatura no seletor', () => {
  it('diz "paga" e "não paga", que é o que muda o efeito', () => {
    expect(rotuloDoStatusDaFatura('PAGA')).toBe('paga')
    expect(rotuloDoStatusDaFatura('PENDENTE')).toBe('não paga')
  })

  it('deixa passar um status que ainda não conhece em vez de apagá-lo', () => {
    expect(rotuloDoStatusDaFatura('EM_ANALISE')).toBe('EM_ANALISE')
  })
})
