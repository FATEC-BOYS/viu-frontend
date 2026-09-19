import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const listNotificacoes = vi.fn()
const listFacetasDeNotificacoes = vi.fn()
vi.mock('@/lib/notificacoes', async () => {
  const real = await vi.importActual<any>('@/lib/notificacoes')
  return {
    ...real,
    listNotificacoes: (...a: any[]) => listNotificacoes(...a),
    listFacetasDeNotificacoes: (...a: any[]) => listFacetasDeNotificacoes(...a),
    marcarComoLida: vi.fn(),
    marcarTodasComoLidas: vi.fn(),
    excluirNotificacao: vi.fn(),
  }
})

import NotificacoesPage from '../page'

function pagina(itens: any[], extra: Partial<Record<string, number>> = {}) {
  return { itens, total: itens.length, naoLidas: itens.filter((i) => !i.lida).length, paginas: 1, ...extra }
}

const umaNotificacao = {
  id: 'n1',
  titulo: 'Arte aprovada ✅',
  conteudo: 'A arte "Logo" foi aprovada pelo cliente.',
  tipo: 'ARTE_APROVADA',
  canal: 'SISTEMA',
  lida: false,
  criadoEm: new Date().toISOString(),
  entidadeTipo: 'ARTE',
  entidadeId: 'a1',
}

beforeEach(() => vi.clearAllMocks())

describe('Tela de notificações', () => {
  /*
   * As facetas são o cromo do filtro; a lista é o conteúdo. Estavam num
   * `Promise.all`, então uma faceta que falhasse apagava a caixa de entrada
   * inteira — inclusive na janela de um deploy em que a tela sobe antes de o
   * servidor conhecer `/notificacoes/facetas`.
   */
  it('mostra as notificações mesmo quando as facetas falham', async () => {
    listNotificacoes.mockResolvedValue(pagina([umaNotificacao]))
    listFacetasDeNotificacoes.mockRejectedValue(new Error('404'))

    render(<NotificacoesPage />)

    expect(await screen.findByText('Arte aprovada ✅')).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar as notificações.')).not.toBeInTheDocument()
  })

  it('avisa quando a lista em si falha', async () => {
    listNotificacoes.mockRejectedValue(new Error('500'))
    listFacetasDeNotificacoes.mockResolvedValue({ tipos: [], canais: [] })

    render(<NotificacoesPage />)

    expect(await screen.findByText('Não foi possível carregar as notificações.')).toBeInTheDocument()
  })

  /*
   * O cabeçalho contava as linhas carregadas, e o sino da lateral lia o total
   * do servidor: passando da primeira página, os dois discordavam.
   */
  it('conta pelo total do servidor, não pelas linhas da página', async () => {
    listNotificacoes.mockResolvedValue({ itens: [umaNotificacao], total: 137, naoLidas: 42, paginas: 7 })
    listFacetasDeNotificacoes.mockResolvedValue({ tipos: [], canais: [] })

    render(<NotificacoesPage />)

    await waitFor(() => expect(screen.getByText(/137 notificações/)).toBeInTheDocument())
    expect(screen.getByText(/42 não lidas/)).toBeInTheDocument()
  })

  it('o canal só vira filtro quando existe mais de um', async () => {
    // Hoje nada no sistema escreve EMAIL ou PUSH: oferecer o filtro era
    // oferecer duas opções que só sabiam devolver lista vazia.
    listNotificacoes.mockResolvedValue(pagina([umaNotificacao]))
    listFacetasDeNotificacoes.mockResolvedValue({
      tipos: [{ tipo: 'ARTE_APROVADA', rotulo: 'Arte aprovada', total: 1 }],
      canais: [{ canal: 'SISTEMA', total: 1 }],
    })

    render(<NotificacoesPage />)

    await screen.findByText('Arte aprovada ✅')
    expect(screen.queryByRole('button', { name: /^Canal/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Tipo/ })).toBeInTheDocument()
  })

  it('não oferece "marcar todas" quando não há não lidas', async () => {
    listNotificacoes.mockResolvedValue(pagina([{ ...umaNotificacao, lida: true }]))
    listFacetasDeNotificacoes.mockResolvedValue({ tipos: [], canais: [] })

    render(<NotificacoesPage />)

    await screen.findByText('Arte aprovada ✅')
    expect(screen.queryByRole('button', { name: /Marcar todas/ })).not.toBeInTheDocument()
  })
})
