import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ParadoNoCliente, { type ItemParado } from '../ParadoNoCliente'

/**
 * O título desta faixa é uma afirmação sobre de quem é a bola.
 *
 * Ele era fixo em "Parado no cliente", e dois dos três estados vazios falavam
 * de coisa parada em VOCÊ — "Você ainda não mandou nenhum link", "primeiro
 * sobe a arte". Título e corpo se desmentiam na mesma caixa, e é justamente
 * essa pergunta que a faixa existe para responder.
 */

const ITEM: ItemParado = {
  id: 'l1',
  arte: 'Logo v2',
  cliente: 'João Santos',
  dias: 5,
  aberto: false,
  href: '/viewer/arte/a1',
}

describe('ParadoNoCliente', () => {
  it('orienta a preparar a revisão quando o que falta é você mandar o link', () => {
    render(<ParadoNoCliente itens={[]} proximoPasso="link" />)
    expect(screen.getByText(/prepare a revisão/i)).toBeInTheDocument()
    expect(screen.queryByText(/aguardando decisão/i)).not.toBeInTheDocument()
  })

  it('orienta a preparar a revisão quando nem a arte subiu ainda', () => {
    render(<ParadoNoCliente itens={[]} proximoPasso="arte" />)
    expect(screen.getByText(/prepare a revisão/i)).toBeInTheDocument()
  })

  it('mostra a espera pela decisão quando há de fato algo esperando ele', () => {
    render(<ParadoNoCliente itens={[ITEM]} proximoPasso={null} />)
    expect(screen.getByText(/aguardando decisão/i)).toBeInTheDocument()
    expect(screen.getByText(/Sem acesso registrado no link/i)).toBeInTheDocument()
  })

  it('não presume que um link vazio já recebeu retorno', () => {
    // Vazio por calmaria, não por falta de ação sua: a bola não voltou para
    // você, simplesmente não há nada pendente.
    render(<ParadoNoCliente itens={[]} proximoPasso={null} />)
    expect(screen.getByText(/aguardando decisão/i)).toBeInTheDocument()
    expect(screen.getByText(/Nenhuma aprovação pendente/i)).toBeInTheDocument()
  })
})
