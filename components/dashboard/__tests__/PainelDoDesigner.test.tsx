import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PainelDoDesigner from '../PainelDoDesigner'

const getAll = vi.fn()
vi.mock('@/lib/api', () => ({ getAll: (...args: unknown[]) => getAll(...args), api: { get: async (path: string) => ({ data: await getAll(path) }) } }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'designer', tipo: 'DESIGNER', nome: 'Ana' }, loading: false }) }))
vi.mock('@/lib/pagamentos', () => ({ pagamentosApi: {
  getMinhaAssinatura: async () => ({ data: null }),
  getFaturas: async () => ({ data: [] }),
  getSaldo: async () => ({ data: null }),
} }))
vi.mock('@/components/dashboard/TrilhaInicial', () => ({ default: () => null }))
vi.mock('@/components/dashboard/FunilDoLink', () => ({ default: () => null }))
vi.mock('@/components/dashboard/EstaSemana', () => ({ default: () => null }))
vi.mock('@/components/dashboard/DesdeOntem', () => ({ default: () => null }))

const projetos = Array.from({ length: 15 }, (_, i) => ({
  id: `p${i}`, nome: `Projeto ${i}`, status: 'EM_ANDAMENTO',
  designer: { id: 'designer' }, cliente: { id: 'cliente', nome: 'Cliente' }, metricas: { totalArtes: 1 },
}))
beforeEach(() => {
  getAll.mockReset()
  getAll.mockImplementation(async (path: string) => {
    if (path === '/projetos') return projetos
    if (path.startsWith('/feedbacks')) return [
      { id: 'aberto', autorId: 'cliente', conteudo: 'Ajustar contraste', arte: { id: 'arte', projeto: { id: 'p14' } } },
      { id: 'resolvido', resolvidoEm: '2026-10-14', conteudo: 'Resolvido', arte: { projeto: { id: 'p0' } } },
      { id: 'meu', autorId: 'designer', conteudo: 'Meu comentário', arte: { projeto: { id: 'p0' } } },
    ]
    return []
  })
})
it('conta comentários abertos de terceiros e abre o comentário na arte', async () => {
  render(<PainelDoDesigner />)
  expect(await screen.findByText('1 comentário em aberto')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ajustar contraste/ })).toHaveAttribute('href', '/viewer/arte/arte?feedback=aberto')
  expect(screen.queryByText('Meu comentário')).not.toBeInTheDocument()
  expect(getAll).toHaveBeenCalledWith('/feedbacks?status=ABERTO')
  expect(getAll).not.toHaveBeenCalledWith(expect.stringContaining('/tarefas'))
})
it('não anuncia tudo em dia quando a consulta falha e permite recuperar', async () => {
  getAll.mockRejectedValueOnce(new Error('rede'))
  render(<PainelDoDesigner />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Suas pendências não puderam ser verificadas')
  expect(screen.queryByText(/Tudo em dia/)).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('1 comentário em aberto')).toBeInTheDocument()
})
it('um link isolado não vira aprovação pendente; versão antiga não vira espera atual', async () => {
  const original = getAll.getMockImplementation()!
  getAll.mockImplementation(async (path: string) => {
    if (path === '/links') return [{ id: 'link', arte: { id: 'arte', projetoId: 'p0' } }]
    if (path === '/aprovacoes') return [
      { id: 'antiga', status: 'PENDENTE', versaoNumero: 1, arte: { id: 'arte', nome: 'Versão antiga', versao: 2, projetoId: 'p0' } },
      { id: 'atual', status: 'PENDENTE', versaoNumero: 2, criadoEm: new Date().toISOString(), aprovador: { nome: 'Bia' }, arte: { id: 'arte', nome: 'Arte atual', versao: 2, projetoId: 'p0' } },
    ]
    return original(path)
  })
  render(<PainelDoDesigner />)
  expect(await screen.findByText('Decisão solicitada a Bia')).toBeInTheDocument()
  expect(screen.queryByText('Versão antiga')).not.toBeInTheDocument()
})
it('pedido de ajuste sem comentário separado também impede um falso tudo em dia', async () => {
  const original = getAll.getMockImplementation()!
  getAll.mockImplementation(async (path: string) => {
    if (path.startsWith('/feedbacks')) return []
    if (path === '/aprovacoes') return [
      { id: 'ajuste', status: 'REJEITADO', versaoNumero: 2, comentario: 'Trocar a cor', arte: { id: 'arte', nome: 'Cartaz', versao: 2, projetoId: 'p0' } },
      { id: 'outro', status: 'PENDENTE', versaoNumero: 2, arte: { id: 'arte', nome: 'Cartaz', versao: 2, projetoId: 'p0' } },
    ]
    return original(path)
  })
  render(<PainelDoDesigner />)
  expect(await screen.findByText('1 arte com ajustes pedidos')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Ver ajustes' })).toHaveAttribute('href', '/artes?arte=arte')
  expect(screen.queryByText(/Tudo em dia/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Decisão solicitada/)).not.toBeInTheDocument()
})
