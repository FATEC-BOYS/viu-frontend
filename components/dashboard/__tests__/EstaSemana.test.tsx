import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import EstaSemana from '../EstaSemana'

/**
 * Esta é a única faixa do painel que devolve alguma coisa — as outras são
 * dívida. Por isso a cor dela tem que significar algo: um bloco verde com um
 * zero gigante dizia "indo bem" enquanto o número dizia "nada aconteceu", e
 * gastava justamente o destaque que faz a semana boa valer.
 */

function renderSemana(aprovacoes: number, historico: number[]) {
  const { container } = render(
    <EstaSemana resumo={{ aprovacoes, historico, aReceberCentavos: 0, proximaFatura: null }} />,
  )
  return container
}

describe('EstaSemana', () => {
  it('não pinta de menta uma semana de zero aprovações', () => {
    const container = renderSemana(0, [0, 0, 0, 0])
    expect(container.querySelector('[class*="bg-pastel-menta"]')).toBeNull()
  })

  it('pinta quando há o que comemorar', () => {
    const container = renderSemana(3, [0, 1, 2, 3])
    expect(container.querySelector('[class*="bg-pastel-menta"]')).not.toBeNull()
  })

  it('esconde a linha do tempo quando ela seria uma reta de zeros', () => {
    const container = renderSemana(0, [0, 0, 0, 0])
    expect(container.querySelector('svg')).toBeNull()
  })

  it('mas mostra a linha quando o zero tem com o que se comparar', () => {
    const container = renderSemana(0, [3, 2, 1, 0])
    expect(container.querySelector('svg')).not.toBeNull()
    // E o recado nomeia a queda, em vez de só marcar zero.
    expect(screen.getByText(/semana passada teve/i)).toBeInTheDocument()
  })
})
