import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SaldoCard from '../SaldoCard'
import type { SaldoInfo } from '@/lib/pagamentos'

/**
 * O card mostra o valor travado por disputa.
 *
 * Sem isso o designer só via o saldo menor: o backend passou a descontar
 * disputas em aberto, e um número que encolhe sem explicação parece dinheiro
 * sumido. O bloco só aparece quando há algo travado, para não poluir o caso
 * normal com uma linha zerada.
 */
function saldo(over: Partial<SaldoInfo> = {}): SaldoInfo {
  return {
    saldo: 100_00,
    saldoFormatado: 'R$ 100,00',
    totalRecebido: 100_00,
    totalRecebidoFormatado: 'R$ 100,00',
    totalSacado: 0,
    totalSacadoFormatado: 'R$ 0,00',
    saldoBloqueado: 0,
    saldoBloqueadoFormatado: 'R$ 0,00',
    ...over,
  }
}

describe('SaldoCard — valor bloqueado', () => {
  it('não mostra o bloco quando não há nada travado', () => {
    render(<SaldoCard info={saldo()} />)
    expect(screen.queryByText(/bloqueado em disputa/i)).not.toBeInTheDocument()
  })

  it('mostra o valor travado quando há disputa aberta', () => {
    render(
      <SaldoCard
        info={saldo({
          saldo: 60_00,
          saldoBloqueado: 40_00,
          saldoBloqueadoFormatado: 'R$ 40,00',
        })}
      />,
    )

    expect(screen.getByText(/bloqueado em disputa/i)).toBeInTheDocument()
    expect(screen.getByText('R$ 40,00')).toBeInTheDocument()
  })

  it('explica por que o saldo está menor, em vez de só exibir o número', () => {
    render(
      <SaldoCard
        info={saldo({ saldo: 60_00, saldoBloqueado: 40_00, saldoBloqueadoFormatado: 'R$ 40,00' })}
      />,
    )
    // Não basta o rótulo: precisa dizer que o dinheiro volta, senão parece perda.
    expect(
      screen.getByText(/volta para o\s+saldo disponível|volta para o saldo/i),
    ).toBeInTheDocument()
  })

  it('segue mostrando recebido e sacado', () => {
    render(<SaldoCard info={saldo()} />)
    expect(screen.getByText(/total recebido/i)).toBeInTheDocument()
    expect(screen.getByText(/total sacado/i)).toBeInTheDocument()
  })
})
