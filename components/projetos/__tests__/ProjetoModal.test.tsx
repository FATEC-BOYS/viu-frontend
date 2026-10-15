import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProjetoModal from '../ProjetoModal'
const cliente = 'c000000000000000000000002'
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'c000000000000000000000001', tipo: 'DESIGNER' } }) }))
vi.mock('@/lib/projects', () => ({ listClientes: vi.fn(async () => [{ id: cliente, nome: 'Cliente' }]) }))
vi.mock('../AsyncUserSingleSelect', () => ({ default: ({ onChange }: { onChange: (id: string) => void }) => <button onClick={() => onChange(cliente)}>Selecionar cliente</button> }))
vi.mock('../EquipeSelect', () => ({ default: () => null }))
beforeEach(() => vi.clearAllMocks())
async function revisar() {
  fireEvent.change(screen.getByLabelText('Nome do projeto'), { target: { value: 'Campanha' } })
  fireEvent.click(screen.getByText('Selecionar cliente'))
  await waitFor(() => expect(screen.getByText(/Passo 1 de 2/)).toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
  await screen.findByText('Tudo pronto para seguir?')
  fireEvent.click(screen.getByRole('checkbox'))
}
it('envia somente os campos persistidos e apresenta a regra real de aprovação', async () => {
  const salvar = vi.fn(async (_values: unknown) => {})
  render(<ProjetoModal open onOpenChange={vi.fn()} onSubmit={salvar} />)
  await revisar()
  expect(screen.queryByText('Clientes aprovadores')).not.toBeInTheDocument()
  expect(screen.getByText(/O cliente principal aprova ou pede ajustes/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }))
  await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
  expect(salvar.mock.calls[0][0]).not.toHaveProperty('aprovacao')
  expect(salvar.mock.calls[0][0]).not.toHaveProperty('participantes')
})
it('mantém o formulário aberto e mostra a falha ao salvar', async () => {
  const fechar = vi.fn()
  render(<ProjetoModal open onOpenChange={fechar} onSubmit={vi.fn(async () => { throw new Error('Serviço temporariamente indisponível') })} />)
  await revisar()
  fireEvent.click(screen.getByRole('button', { name: 'Criar projeto' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Serviço temporariamente indisponível')
  expect(fechar).not.toHaveBeenCalled()
})
