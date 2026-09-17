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
  it('diz "Parado em você" quando o que falta é você mandar o link', () => {
    render(<ParadoNoCliente itens={[]} proximoPasso="link" />)
    expect(screen.getByText(/parado em você/i)).toBeInTheDocument()
    expect(screen.queryByText(/parado no cliente/i)).not.toBeInTheDocument()
  })

  it('diz "Parado em você" quando nem a arte subiu ainda', () => {
    render(<ParadoNoCliente itens={[]} proximoPasso="arte" />)
    expect(screen.getByText(/parado em você/i)).toBeInTheDocument()
  })

  it('volta a ser "Parado no cliente" quando há de fato algo esperando ele', () => {
    render(<ParadoNoCliente itens={[ITEM]} proximoPasso={null} />)
    expect(screen.getByText(/parado no cliente/i)).toBeInTheDocument()
    expect(screen.getByText(/João Santos ainda não abriu/i)).toBeInTheDocument()
  })

  it('e continua "Parado no cliente" quando tudo já teve retorno', () => {
    // Vazio por calmaria, não por falta de ação sua: a bola não voltou para
    // você, simplesmente não há nada pendente.
    render(<ParadoNoCliente itens={[]} proximoPasso={null} />)
    expect(screen.getByText(/parado no cliente/i)).toBeInTheDocument()
    expect(screen.getByText(/já teve retorno/i)).toBeInTheDocument()
  })
})
