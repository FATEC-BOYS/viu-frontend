import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * O roteador do painel: qual tela cada papel recebe.
 *
 * Havia uma tela só — a do designer — servida a todo mundo. A correção chegou
 * no cliente e parou ali, então ADMIN continuava caindo no `else`. E como
 * `getAccessibleProjectIds` devolve `null` para admin (ou seja, sem
 * restrição), as consultas por trás daquele painel devolviam a plataforma
 * inteira com as palavras de quem trabalha: "esperando você" sobre comentários
 * que esperavam outra pessoa, "Seus projetos" sobre projetos alheios, e a
 * trilha de primeiros passos já concluída pelo trabalho dos outros.
 *
 * O admin coordena a plataforma; a visão dele é macro.
 */

const useAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => useAuth() }))
vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('@/components/dashboard/AguardandoVoce', () => ({ default: () => <div>aguardando-voce</div> }))
vi.mock('@/components/dashboard/PainelDoDesigner', () => ({ default: () => <div>painel-designer</div> }))
vi.mock('@/components/dashboard/PainelDoCliente', () => ({ default: () => <div>painel-cliente</div> }))
vi.mock('@/components/dashboard/PainelDoAdmin', () => ({ default: () => <div>painel-admin</div> }))

import DashboardPage from '../page'

function comoPapel(tipo: string | null, loading = false) {
  useAuth.mockReturnValue({
    user: tipo ? { id: 'u1', nome: 'Alguém', tipo } : null,
    loading,
  })
  render(<DashboardPage />)
}

beforeEach(() => vi.clearAllMocks())

describe('roteador do painel', () => {
  it('o admin recebe a visão macro da plataforma', () => {
    comoPapel('ADMIN')
    expect(screen.getByText('painel-admin')).toBeInTheDocument()
    expect(screen.queryByText('painel-designer')).not.toBeInTheDocument()
  })

  it('o admin não recebe a fila pessoal de quem trabalha', () => {
    // `AguardandoVoce` é a faixa de "o que espera VOCÊ" — para o admin ela
    // listaria pendência alheia, porque o escopo dele não restringe nada.
    comoPapel('ADMIN')
    expect(screen.queryByText('aguardando-voce')).not.toBeInTheDocument()
  })

  it('o cliente recebe o painel do cliente', () => {
    comoPapel('CLIENTE')
    expect(screen.getByText('painel-cliente')).toBeInTheDocument()
    expect(screen.queryByText('painel-designer')).not.toBeInTheDocument()
  })

  it('o designer recebe o painel do designer, com a própria fila', () => {
    comoPapel('DESIGNER')
    expect(screen.getByText('painel-designer')).toBeInTheDocument()
    expect(screen.getByText('aguardando-voce')).toBeInTheDocument()
  })

  it('não monta painel nenhum enquanto não sabe quem está olhando', () => {
    // Montar o do designer antes de `/auth/me` responder faria a tela errada
    // piscar antes da certa.
    comoPapel(null, true)
    for (const painel of ['painel-admin', 'painel-cliente', 'painel-designer']) {
      expect(screen.queryByText(painel)).not.toBeInTheDocument()
    }
  })
})
