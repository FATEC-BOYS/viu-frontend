import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import FinancialRouteGate from '../FinancialRouteGate'
import AdminOnly from '../AdminOnly'
import ProjetoTabs from '@/components/projetos/ProjetoTabs'

const state = vi.hoisted(() => ({ tipo: 'DESIGNER', loading: false, path: '/faturas/123', replace: vi.fn(), mounted: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { tipo: state.tipo }, loading: state.loading }) }))
vi.mock('next/navigation', () => ({ usePathname: () => state.path, useRouter: () => ({ replace: state.replace }) }))
function Conteudo() {
  useEffect(() => { state.mounted() }, [])
  return <p>Conteúdo comercial</p>
}
beforeEach(() => { vi.clearAllMocks(); state.tipo = 'DESIGNER'; state.loading = false; state.path = '/faturas/123' })

describe('módulos comerciais do piloto', () => {
  it.each(['DESIGNER', 'CLIENTE'])('não monta a página financeira para %s', tipo => {
    state.tipo = tipo
    render(<FinancialRouteGate><Conteudo /></FinancialRouteGate>)
    expect(state.mounted).not.toHaveBeenCalled()
    expect(state.replace).toHaveBeenCalledWith('/dashboard')
  })
  it('espera a sessão sem exibir a página', () => {
    state.loading = true
    render(<FinancialRouteGate><Conteudo /></FinancialRouteGate>)
    expect(state.mounted).not.toHaveBeenCalled()
    expect(state.replace).not.toHaveBeenCalled()
  })
  it('mantém o acesso do ADM', () => {
    state.tipo = 'ADMIN'
    render(<FinancialRouteGate><Conteudo /></FinancialRouteGate>)
    expect(screen.getByText('Conteúdo comercial')).toBeInTheDocument()
    expect(state.replace).not.toHaveBeenCalled()
  })
  it('preserva o caminho de projetos e revisão', () => {
    state.path = '/projetos/p1'
    render(<FinancialRouteGate><Conteudo /></FinancialRouteGate>)
    expect(state.mounted).toHaveBeenCalledTimes(1)
    expect(state.replace).not.toHaveBeenCalled()
  })
  it('não monta componentes financeiros escondidos', () => {
    render(<AdminOnly><Conteudo /></AdminOnly>)
    expect(state.mounted).not.toHaveBeenCalled()
  })
  it.each(['DESIGNER', 'CLIENTE'])('oculta Fatura das abas de %s', tipo => {
    state.tipo = tipo
    render(<ProjetoTabs current="overview" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Fatura' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovação' })).toBeInTheDocument()
  })
  it('mantém Fatura no projeto do ADM', () => {
    state.tipo = 'ADMIN'
    render(<ProjetoTabs current="overview" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Fatura' })).toBeInTheDocument()
  })
})
