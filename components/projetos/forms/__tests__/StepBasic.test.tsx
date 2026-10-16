import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import StepBasic from '../StepBasic'
vi.mock('@/components/layout/AdminOnly', () => ({ default: () => null }))
vi.mock('../../AsyncUserSingleSelect', () => ({ default: () => null }))
vi.mock('../../EquipeSelect', () => ({ default: () => null }))
const values = { nome: 'Projeto', status: 'RASCUNHO' as const, orcamento: 0, cliente_id: null, equipe_id: null }
it('rascunho não oferece concluir e mantém o status atual visível', () => {
  render(<StepBasic values={values} setValues={vi.fn()} souCliente statusInicial="RASCUNHO" />)
  fireEvent.click(screen.getByRole('combobox', { name: 'Status do projeto' }))
  expect(screen.queryByRole('option', { name: 'Concluído' })).not.toBeInTheDocument()
  expect(screen.getAllByText(/aguardando aceite/).length).toBeGreaterThan(0)
  expect(screen.getByRole('option', { name: 'Em andamento' })).toBeInTheDocument()
})
it('projeto concluído não permite reabrir pelo seletor', () => {
  render(<StepBasic values={{ ...values, status: 'CONCLUIDO' }} setValues={vi.fn()} souCliente statusInicial="CONCLUIDO" />)
  expect(screen.getByRole('combobox', { name: 'Status do projeto' })).toBeDisabled()
})
it('novo projeto não oferece nascer concluído', () => {
  render(<StepBasic values={{ ...values, status: 'EM_ANDAMENTO' }} setValues={vi.fn()} souCliente />)
  expect(screen.getByRole('combobox', { name: 'Status do projeto' })).toBeDisabled()
})
