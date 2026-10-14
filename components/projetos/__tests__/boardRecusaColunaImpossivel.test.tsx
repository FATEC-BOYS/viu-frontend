import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/dom'
import BoardView from '../BoardView'
import type { Projeto } from '@/lib/projects'

/**
 * A coluna que não pode receber o cartão não aceita o cartão.
 *
 * O quadro oferecia as quatro colunas como destino de qualquer cartão, e a
 * recusa vinha depois — medido no app, logado como designer:
 *
 *   para "Aguardando aceite" : 0 requisições (o validador do front barrava),
 *                              aviso "Não consegui mover, desfazendo…"
 *   saindo de "Concluído"    : PUT → 500 ("concluído é terminal"), mesmo aviso
 *
 * Nos dois casos o cartão trocava de coluna e voltava sozinho, e a pessoa não
 * ficava sabendo por quê. Agora a recusa chega na mão: sem `preventDefault` no
 * `dragover` o navegador mostra "não dá" e o `drop` nunca acontece.
 *
 * É isso que estes testes medem — `fireEvent` devolve `false` quando o evento
 * foi cancelado (ou seja, quando o drop FOI autorizado) e `true` quando
 * ninguém o cancelou. Contra o código antigo, que chamava `preventDefault`
 * sempre, as asserções de recusa falham.
 */

const base = {
  descricao: null,
  orcamento: null,
  prazo: null,
  designer: { id: 'd1', nome: 'Ana' },
  cliente: { id: 'c1', nome: 'João' },
  equipe: null,
} as unknown as Projeto

const emAndamento: Projeto = { ...base, id: 'p-andamento', nome: 'Em andamento', status: 'EM_ANDAMENTO' }
const concluido: Projeto = { ...base, id: 'p-concluido', nome: 'Concluído', status: 'CONCLUIDO' }

const coluna = (status: string) => document.querySelector(`[data-status="${status}"]`)!
const cartao = (id: string) => document.getElementById(id)!

/** Um `dataTransfer` mínimo — o `onDrop` lê estas duas chaves. */
const transferencia = (id: string, de: string) => ({
  dataTransfer: {
    getData: (chave: string) => (chave === 'text/plain' ? id : de),
    setData: () => {},
    effectAllowed: 'move',
  },
})

type Mover = (id: string, de: Projeto['status'], para: Projeto['status']) => void
let onMove: ReturnType<typeof vi.fn<Mover>>

beforeEach(() => {
  onMove = vi.fn<Mover>()
})

describe('arrastando um projeto em andamento', () => {
  beforeEach(() => {
    render(<BoardView projects={[emAndamento, concluido]} onMove={onMove} />)
    fireEvent.dragStart(cartao('p-andamento'), transferencia('p-andamento', 'EM_ANDAMENTO'))
  })

  it('a coluna "Pausado" aceita o drop', () => {
    const cancelado = !fireEvent.dragOver(coluna('PAUSADO'))
    expect(cancelado).toBe(true)

    fireEvent.drop(coluna('PAUSADO'), transferencia('p-andamento', 'EM_ANDAMENTO'))
    expect(onMove).toHaveBeenCalledWith('p-andamento', 'EM_ANDAMENTO', 'PAUSADO')
  })

  it('a coluna "Aguardando aceite" não aceita o drop', () => {
    const cancelado = !fireEvent.dragOver(coluna('RASCUNHO'))
    expect(cancelado).toBe(false)
  })

  it('e ela diz por que, enquanto o cartão está sobre ela', () => {
    fireEvent.dragOver(coluna('RASCUNHO'))
    expect(screen.getByText(/aceite do convite/i)).toBeTruthy()
  })

  /*
   * A guarda do `onDrop` é a segunda linha: se um navegador entregar o drop
   * mesmo sem autorização, isso não pode virar uma gravação inválida.
   */
  it('nem se o drop chegar à força', () => {
    fireEvent.drop(coluna('RASCUNHO'), transferencia('p-andamento', 'EM_ANDAMENTO'))
    expect(onMove).not.toHaveBeenCalled()
  })
})

describe('arrastando um projeto concluído', () => {
  beforeEach(() => {
    render(<BoardView projects={[emAndamento, concluido]} onMove={onMove} />)
    fireEvent.dragStart(cartao('p-concluido'), transferencia('p-concluido', 'CONCLUIDO'))
  })

  it('nenhuma outra coluna o aceita — concluído é o fim da linha', () => {
    for (const destino of ['RASCUNHO', 'EM_ANDAMENTO', 'PAUSADO']) {
      expect(!fireEvent.dragOver(coluna(destino))).toBe(false)
    }
    fireEvent.drop(coluna('EM_ANDAMENTO'), transferencia('p-concluido', 'CONCLUIDO'))
    expect(onMove).not.toHaveBeenCalled()
  })

  it('a própria coluna dele continua aceitando — voltar atrás não é mover', () => {
    expect(!fireEvent.dragOver(coluna('CONCLUIDO'))).toBe(true)
  })
})

/**
 * Sem nada na mão, o quadro não pode estar recusando nada: a decisão vale para
 * o cartão que está sendo arrastado, e some quando o arrasto termina.
 */
describe('depois de soltar', () => {
  it('as colunas voltam a aceitar', () => {
    render(<BoardView projects={[emAndamento, concluido]} onMove={onMove} />)

    fireEvent.dragStart(cartao('p-concluido'), transferencia('p-concluido', 'CONCLUIDO'))
    expect(!fireEvent.dragOver(coluna('PAUSADO'))).toBe(false)

    fireEvent.dragEnd(cartao('p-concluido'))
    expect(!fireEvent.dragOver(coluna('PAUSADO'))).toBe(true)
  })
})
