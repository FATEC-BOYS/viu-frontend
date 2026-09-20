import { describe, it, expect } from 'vitest'
import { situacaoDaAssinatura, CLASSE_ASSINATURA, ROTULO_ASSINATURA } from '@/lib/assinatura'
import type { Vigencia, Plano } from '@/lib/pagamentos'

const GRATUITO = { id: 'p0', nome: 'Gratuito', precoMensal: 0 } as Plano
const PRO = { id: 'p1', nome: 'Profissional', precoMensal: 4900 } as Plano

function vigencia(extra: Partial<Vigencia> = {}): Vigencia {
  return { assinatura: null, plano: GRATUITO, vigenteAte: null, cancelada: false, ...extra }
}

function linha(extra: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    status: 'ATIVA',
    renovacaoAutomatica: true,
    periodoInicio: '2026-09-17T00:00:00.000Z',
    periodoFim: '2026-10-17T00:00:00.000Z',
    plano: PRO,
    ...extra,
  } as any
}

/*
 * A tela dizia "Você ainda não tem uma assinatura ativa" para quem o resto do
 * sistema já tratava como assinante do Gratuito — a taxa da fatura e o teto de
 * recursos vinham de lá desde sempre. E, depois de cancelar, dizia a mesma
 * coisa: o servidor não devolvia assinatura cancelada.
 */
describe('A situação da assinatura', () => {
  it('trata quem não assinou nada como assinante do Gratuito, não como sem plano', () => {
    const s = situacaoDaAssinatura(vigencia())

    expect(s.rotulo).toBe('Ativa')
    // Não há contratação para encerrar: o Gratuito é o piso da conta.
    expect(s.podeCancelar).toBe(false)
  })

  /*
   * Cancelada e ainda valendo fica gravada como ATIVA com a renovação
   * desligada — é assim que o servidor preserva o que já foi pago. Ler só o
   * status diria "Ativa" e esconderia justamente o que quem cancelou quer
   * confirmar.
   */
  it('diz "Cancelada" e até quando vale, mesmo com o status ainda ATIVA', () => {
    const s = situacaoDaAssinatura(
      vigencia({
        assinatura: linha({ renovacaoAutomatica: false }),
        plano: PRO,
        cancelada: true,
        vigenteAte: '2026-10-17T00:00:00.000Z',
      }),
    )

    expect(s.rotulo).toBe('Cancelada')
    expect(s.detalhe).toContain('vale até')
    expect(s.detalhe).toContain('out')
    expect(s.detalhe).toContain('Gratuito')
    // Já cancelada: oferecer cancelar de novo é um botão sem efeito.
    expect(s.podeCancelar).toBe(false)
  })

  it('oferece cancelar só para quem tem contratação de pé', () => {
    expect(situacaoDaAssinatura(vigencia({ assinatura: linha(), plano: PRO })).podeCancelar).toBe(true)
    expect(
      situacaoDaAssinatura(vigencia({ assinatura: linha({ status: 'PAUSADA' }), plano: PRO })).podeCancelar,
    ).toBe(true)
    expect(
      situacaoDaAssinatura(vigencia({ assinatura: linha({ status: 'PENDENTE' }), plano: PRO })).podeCancelar,
    ).toBe(false)
  })

  it('explica o que fazer quando a cobrança parou ou o checkout não fechou', () => {
    expect(
      situacaoDaAssinatura(vigencia({ assinatura: linha({ status: 'PAUSADA' }), plano: PRO })).detalhe,
    ).toMatch(/cobrança recorrente parou/i)
    expect(
      situacaoDaAssinatura(vigencia({ assinatura: linha({ status: 'PENDENTE' }), plano: PRO })).detalhe,
    ).toMatch(/checkout/i)
  })

  it('não inventa frase de apoio para quem está simplesmente em dia', () => {
    expect(situacaoDaAssinatura(vigencia({ assinatura: linha(), plano: PRO })).detalhe).toBeNull()
  })
})

/*
 * As cores estavam escritas duas vezes (aqui e em /perfil) e as duas cópias já
 * divergiam. Só o tom 400 sobre cartão branco é ilegível: cada status precisa
 * de variante clara e escura.
 */
describe('As cores de cada status', () => {
  it('declara rótulo e cor para todo status, sem sobrar nenhum', () => {
    expect(Object.keys(CLASSE_ASSINATURA).sort()).toEqual(Object.keys(ROTULO_ASSINATURA).sort())
  })

  it('dá variante clara e escura a todo status colorido', () => {
    for (const [status, classe] of Object.entries(CLASSE_ASSINATURA)) {
      if (status === 'EXPIRADA') continue // usa tokens do tema, que já viram os dois
      expect(classe, status).toMatch(/dark:text-/)
      // O tom claro não pode ser o 400, que nasceu para fundo escuro.
      expect(classe, status).not.toMatch(/(^|\s)text-\w+-400(\s|$)/)
    }
  })

  it('não repete a mesma declaração dark: duas vezes', () => {
    for (const [status, classe] of Object.entries(CLASSE_ASSINATURA)) {
      const escuras = classe.match(/dark:text-[\w-]+/g) ?? []
      expect(new Set(escuras).size, status).toBe(escuras.length)
    }
  })
})
