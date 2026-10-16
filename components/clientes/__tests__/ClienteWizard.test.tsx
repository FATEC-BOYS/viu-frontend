import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import ClienteWizard from '../ClienteWizard'
const post = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { post } }))
beforeEach(() => { vi.clearAllMocks(); post.mockResolvedValue({ data: { id: 'cliente-1' } }) })
it('um formulário e um único fechamento, sem etapas ou cadastro de projeto', () => {
  render(<ClienteWizard open onOpenChange={vi.fn()} />)
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1)
  expect(screen.queryByText('Avançar')).not.toBeInTheDocument()
  expect(screen.queryByText('Ativo')).not.toBeInTheDocument()
  expect(screen.queryByText('Criar projeto inicial')).not.toBeInTheDocument()
})
async function preencher() {
  await userEvent.type(screen.getByLabelText('Nome do cliente'), 'Café Aurora')
  await userEvent.type(screen.getByLabelText('E-mail'), 'CONTATO@AURORA.COM')
}
it('salva só o contato e informa o pai para atualizar a carteira', async () => {
  const onCreated = vi.fn(), fechar = vi.fn()
  render(<ClienteWizard open onOpenChange={fechar} onCreated={onCreated} />)
  await preencher()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))
  expect(post).toHaveBeenCalledExactlyOnceWith('/clientes', { nome: 'Café Aurora', email: 'contato@aurora.com', telefone: undefined })
  expect(onCreated).toHaveBeenCalledWith('cliente-1')
  expect(fechar).toHaveBeenCalledWith(false)
})
it('mantém os dados e o modal aberto ao falhar', async () => {
  post.mockRejectedValueOnce(new Error('Falha temporária'))
  const fechar = vi.fn()
  render(<ClienteWizard open onOpenChange={fechar} />)
  await preencher()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária')
  expect(screen.getByLabelText('Nome do cliente')).toHaveValue('Café Aurora')
  expect(fechar).not.toHaveBeenCalled()
})
it('impede fechar e enviar de novo durante o cadastro', async () => {
  let resolver!: (v: unknown) => void
  post.mockImplementationOnce(() => new Promise(r => { resolver = r }))
  const fechar = vi.fn()
  render(<ClienteWizard open onOpenChange={fechar} />)
  await preencher()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cliente' }))
  await userEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(fechar).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  resolver({ data: { id: 'cliente-1' } })
  await waitFor(() => expect(fechar).toHaveBeenCalledWith(false))
})
