import { it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjetosDoCliente from '../ProjetosDoCliente'
vi.mock('@/lib/projects', () => ({ listAllProjetos: async () => [
  { id: 'p1', nome: 'Minha entrega', cliente: { id: 'eu' }, designer: { nome: 'Ana' }, status: 'EM_ANDAMENTO' },
  { id: 'p2', nome: 'Outro cliente', cliente: { id: 'outro' }, designer: { nome: 'Ana' }, status: 'EM_ANDAMENTO' },
] }))
it('mostra entregas do cliente sem gestão, quadro ou calendário', async () => {
  render(<ProjetosDoCliente usuarioId="eu" />)
  expect(await screen.findByText('Minha entrega')).toBeInTheDocument()
  expect(screen.queryByText('Outro cliente')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Minha entrega/ })).toHaveAttribute('href', '/projetos/p1')
  for (const label of [/Quadro/, /Calendário/, /Novo projeto/]) expect(screen.queryByText(label)).not.toBeInTheDocument()
})
