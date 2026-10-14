import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjetosPage from '../page'
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'cliente', tipo: 'CLIENTE' }, loading: false }) }))
vi.mock('@/components/projetos/ProjetosDoCliente', () => ({ default: () => <p>Entregas do cliente</p> }))
vi.mock('next/navigation', () => ({
  useRouter: () => { throw new Error('A tela de produção não deveria montar') },
  useSearchParams: () => new URLSearchParams('view=board'),
}))
it('cliente acessa /projetos?view=board sem montar a tela de produção', () => {
  render(<ProjetosPage />)
  expect(screen.getByText('Entregas do cliente')).toBeInTheDocument()
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
})
