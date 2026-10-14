import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjetoDoCliente from '../ProjetoDoCliente'

vi.mock('@/lib/aprovacoesDoCliente', () => ({
  listarDecisoesDoProjeto: vi.fn().mockResolvedValue([{
    id: 'decisao', status: 'PENDENTE', versaoNumero: 2,
    arte: { id: 'arte-1', nome: 'Cartaz', versao: 2, previewUrl: null },
  }]),
  esperandoVoce: (d: any[]) => d,
  jaDecididas: () => [],
}))

it('leva à arte para revisar e decidir, sem aprovar a partir da miniatura', async () => {
  render(<ProjetoDoCliente projeto={{ id: 'p1', nome: 'Campanha', status: 'EM_ANDAMENTO' }} usuarioId="c1" />)
  const link = await screen.findByRole('link', { name: 'Revisar e decidir' })
  expect(link).toHaveAttribute('href', '/viewer/arte/arte-1')
  expect(screen.queryByRole('button', { name: /^Aprovar$/ })).not.toBeInTheDocument()
})
