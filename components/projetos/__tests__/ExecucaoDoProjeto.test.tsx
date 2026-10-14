import { beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExecucaoDoProjeto from '../tarefas/ExecucaoDoProjeto'
const getAll = vi.fn()
const put = vi.fn()
const post = vi.fn()
vi.mock('@/lib/api', () => ({ getAll: (...a: unknown[]) => getAll(...a), api: { put: (...a: unknown[]) => put(...a), post: (...a: unknown[]) => post(...a) } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
beforeEach(() => {
  getAll.mockResolvedValue([{ id: 't1', titulo: 'Ajustar contraste', status: 'PENDENTE' }])
  put.mockReset(); post.mockReset()
})
it('segue as transições reais: iniciar, concluir e retomar', async () => {
  put.mockResolvedValue({})
  render(<ExecucaoDoProjeto projetoId="p1" podeEditar />)
  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar' }))
  expect(put).toHaveBeenLastCalledWith('/tarefas/t1', { status: 'EM_ANDAMENTO' })
  await userEvent.click(screen.getByRole('button', { name: 'Concluir tarefa' }))
  expect(put).toHaveBeenLastCalledWith('/tarefas/t1', { status: 'CONCLUIDA' })
  expect(screen.getByRole('button', { name: 'Retomar tarefa' })).toBeInTheDocument()
})
it('preserva o estado quando o servidor recusa a atualização', async () => {
  put.mockRejectedValue(new Error('rede'))
  render(<ExecucaoDoProjeto projetoId="p1" podeEditar />)
  await userEvent.click(await screen.findByRole('button', { name: 'Iniciar' }))
  expect(await screen.findByRole('button', { name: 'Iniciar' })).toBeEnabled()
})
it('cria tarefa vinculada ao projeto, sem resolver ou aprovar a arte', async () => {
  post.mockResolvedValue({})
  render(<ExecucaoDoProjeto projetoId="p1" podeEditar />)
  await screen.findByText('Ajustar contraste')
  await userEvent.type(screen.getByRole('textbox'), 'Revisar título')
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar tarefa' }))
  expect(post).toHaveBeenCalledWith('/tarefas', { projetoId: 'p1', titulo: 'Revisar título' })
  expect(put).not.toHaveBeenCalled()
})
it('não oferece escrita para quem só pode consultar', async () => {
  render(<ExecucaoDoProjeto projetoId="p1" podeEditar={false} />)
  await screen.findByText('Ajustar contraste')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
