import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

/**
 * O menu segue o papel.
 *
 * Antes DESIGNER, CLIENTE e ADMIN viam quase a mesma lista — só a seção
 * Administração era filtrada. O cliente enxergava Equipes, Tarefas, Saques,
 * Extrato e Disputas: telas que o backend recusa com 403 ou que não dizem
 * nada para ele.
 *
 * Estes testes fixam o que cada papel vê, e principalmente o que NÃO vê.
 */

const mockUser = vi.hoisted(() => ({ atual: null as { tipo: string } | null }))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser.atual }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard' }))
vi.mock('@/lib/api', () => ({
  api: { get: vi.fn().mockResolvedValue({ pagination: { total: 0 } }) },
}))
vi.mock('@/lib/convites', () => ({
  convitesApi: { listarPendentes: vi.fn().mockResolvedValue([]) },
  convitesEquipeApi: { listarPendentes: vi.fn().mockResolvedValue([]) },
}))

import { api } from '@/lib/api'

function renderComo(tipo: 'DESIGNER' | 'CLIENTE' | 'ADMIN') {
  mockUser.atual = { tipo }
  return render(<Sidebar />)
}

const link = (nome: RegExp) => screen.queryByRole('link', { name: nome })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.get).mockResolvedValue({ pagination: { total: 0 } } as never)
})

describe('DESIGNER', () => {
  it('vê o menu de operação completo', () => {
    renderComo('DESIGNER')
    for (const item of [/projetos/i, /artes/i, /tarefas/i, /prazos/i, /clientes/i, /equipes/i]) {
      expect(link(item)).toBeInTheDocument()
    }
  })

  /** Mandar o link ao cliente é fluxo de revisão, não ajuste de conta. */
  it('tem Links compartilhados em Colaboração, não em Configurações', () => {
    renderComo('DESIGNER')
    expect(link(/links compartilhados/i)).toBeInTheDocument()
    expect(screen.getByText('Colaboração')).toBeInTheDocument()
  })

  it('não vê nada de administração', () => {
    renderComo('DESIGNER')
    expect(screen.queryByText('Administração')).not.toBeInTheDocument()
    expect(link(/usuários/i)).not.toBeInTheDocument()
    expect(link(/status do sistema/i)).not.toBeInTheDocument()
  })
})

describe('CLIENTE', () => {
  it('vê só o que é dele', () => {
    renderComo('CLIENTE')
    expect(link(/projetos/i)).toBeInTheDocument()
    expect(link(/notificações/i)).toBeInTheDocument()
    // Escopada por clienteId no backend; a página abre em `tipo: 'cliente'`.
    expect(link(/faturas/i)).toBeInTheDocument()
    expect(link(/perfil/i)).toBeInTheDocument()
  })

  it('não vê as telas que o backend recusa para ele', () => {
    renderComo('CLIENTE')
    for (const item of [
      /equipes/i,
      /^tarefas$/i,
      /saques/i,
      /extrato/i,
      /disputas/i,
      /planos/i,
      /clientes/i,
      /status do sistema/i,
    ]) {
      expect(link(item)).not.toBeInTheDocument()
    }
    expect(screen.queryByText('Administração')).not.toBeInTheDocument()
  })

  /**
   * Eram 7 chamadas no mount para todo papel. O cliente só tem badge em
   * Notificações — as outras seis eram desperdício, e algumas voltavam 403.
   */
  it('busca só o contador que exibe', async () => {
    renderComo('CLIENTE')
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    const rotas = vi.mocked(api.get).mock.calls.map(([rota]) => rota)
    expect(rotas).toEqual(['/notificacoes?lida=false&limit=1'])
  })
})

describe('ADMIN', () => {
  /** Mesmo shell do designer — sem área separada, sem redirect. */
  it('mantém o menu de operação do designer', () => {
    renderComo('ADMIN')
    for (const item of [/projetos/i, /artes/i, /tarefas/i, /clientes/i]) {
      expect(link(item)).toBeInTheDocument()
    }
  })

  it('ganha a seção Administração no fim', () => {
    renderComo('ADMIN')
    expect(screen.getByText('Administração')).toBeInTheDocument()
    expect(link(/usuários/i)).toBeInTheDocument()
    expect(link(/status do sistema/i)).toBeInTheDocument()
  })

  /** Sem o rótulo explícito, "Saques" apareceria duas vezes sem distinção. */
  it('distingue a moderação do financeiro do próprio designer', () => {
    renderComo('ADMIN')
    expect(link(/saques \(moderação\)/i)).toBeInTheDocument()
    expect(link(/^saques$/i)).toBeInTheDocument()
  })
})

describe('cabeçalho', () => {
  it('descreve o produto, não "Gestão de Projetos"', () => {
    renderComo('DESIGNER')
    expect(screen.getByText('Revisão de design')).toBeInTheDocument()
    expect(screen.queryByText('Gestão de Projetos')).not.toBeInTheDocument()
  })
})
