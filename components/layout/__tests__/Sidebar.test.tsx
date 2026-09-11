import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrictMode } from 'react'
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
    for (const item of [/projetos/i, /artes/i, /prazos/i, /clientes/i, /equipes/i]) {
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

/**
 * Tarefas saiu do menu enquanto não existe criador de tarefa no produto: os
 * dois botões de criar tinham um comentário no lugar do onClick, e o único
 * caminho real é "Criar tarefa" sobre um feedback. Sem este teste, repor o
 * item por engano não quebraria nada — e cinco asserções sobre Tarefas foram
 * removidas daqui junto com ele, então o arquivo ficaria sem dizer nada a
 * respeito.
 */
describe('Tarefas escondida', () => {
  it('não aparece no menu de ninguém', () => {
    for (const papel of ['DESIGNER', 'ADMIN', 'CLIENTE'] as const) {
      const { unmount } = renderComo(papel)
      expect(link(/^tarefas$/i)).not.toBeInTheDocument()
      unmount()
    }
  })
})

describe('ADMIN', () => {
  /** Mesmo shell do designer — sem área separada, sem redirect. */
  it('mantém o menu de operação do designer', () => {
    renderComo('ADMIN')
    for (const item of [/projetos/i, /artes/i, /clientes/i]) {
      expect(link(item)).toBeInTheDocument()
    }
  })

  it('ganha a seção Administração no fim', () => {
    renderComo('ADMIN')
    expect(screen.getByText('Administração')).toBeInTheDocument()
    expect(link(/usuários/i)).toBeInTheDocument()
    expect(link(/status do sistema/i)).toBeInTheDocument()
  })

  /** A home da área existia sem link nenhum: só se chegava nela digitando a URL. */
  it('leva à visão geral do admin', () => {
    renderComo('ADMIN')
    expect(link(/visão geral/i)).toHaveAttribute('href', '/admin')
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

/**
 * Conta zerada: quem acabou de chegar clicava em Artes, Feedbacks, Links,
 * Extrato — e encontrava uma sequência de telas vazias, sem saber se o
 * produto estava quebrado ou se era ela que não sabia usar.
 *
 * O bloqueio precisa ser real. `<Link>` com `pointer-events-none` engana só o
 * mouse: teclado e leitor de tela continuam entrando.
 */
describe('itens que dependem de conteúdo', () => {
  /** Responde por rota: o menu pergunta o que a conta já tem. */
  function contaCom({ projetos, artes }: { projetos: number; artes: number }) {
    vi.mocked(api.get).mockImplementation(((rota: string) => {
      if (rota.startsWith('/projetos?limit')) return Promise.resolve({ pagination: { total: projetos } })
      if (rota.startsWith('/artes?limit')) return Promise.resolve({ pagination: { total: artes } })
      return Promise.resolve({ pagination: { total: 0 } })
    }) as never)
  }

  const bloqueado = (nome: RegExp) =>
    screen.queryByRole('link', { name: nome }) === null &&
    screen.getByText(nome).closest('[aria-disabled="true"]') !== null

  it('tranca o que não faz sentido sem projeto', async () => {
    contaCom({ projetos: 0, artes: 0 })
    renderComo('DESIGNER')

    await waitFor(() => expect(bloqueado(/^artes$/i)).toBe(true))
    for (const item of [/^prazos$/i, /^equipes$/i, /^faturas$/i, /^extrato$/i]) {
      expect(bloqueado(item)).toBe(true)
    }
  })

  /** É por onde se começa — trancar seria trancar a saída. */
  it('deixa livres Dashboard, Projetos, Clientes e Notificações', async () => {
    contaCom({ projetos: 0, artes: 0 })
    renderComo('DESIGNER')

    await waitFor(() => expect(bloqueado(/^artes$/i)).toBe(true))
    for (const item of [/^dashboard$/i, /^projetos$/i, /^clientes$/i, /^notificações$/i]) {
      expect(link(item)).toBeInTheDocument()
    }
  })

  /** Assinatura é onde o designer paga o VIU: trancar é trancar a receita. */
  it('nunca tranca Assinatura nem Planos', async () => {
    contaCom({ projetos: 0, artes: 0 })
    renderComo('DESIGNER')

    await waitFor(() => expect(bloqueado(/^artes$/i)).toBe(true))
    expect(link(/^assinatura$/i)).toBeInTheDocument()
    expect(link(/^planos$/i)).toBeInTheDocument()
  })

  it('com projeto e sem arte, libera Artes e segura Feedbacks e Links', async () => {
    contaCom({ projetos: 1, artes: 0 })
    renderComo('DESIGNER')

    await waitFor(() => expect(link(/^artes$/i)).toBeInTheDocument())
    expect(bloqueado(/^feedbacks$/i)).toBe(true)
    expect(bloqueado(/links compartilhados/i)).toBe(true)
  })

  it('com projeto e arte, nada fica trancado', async () => {
    contaCom({ projetos: 2, artes: 3 })
    renderComo('DESIGNER')

    await waitFor(() => expect(link(/^artes$/i)).toBeInTheDocument())
    for (const item of [/^feedbacks$/i, /links compartilhados/i, /^faturas$/i]) {
      expect(link(item)).toBeInTheDocument()
    }
  })

  /**
   * Não saber ainda não é motivo para trancar: o contrário faria todo usuário
   * existente ver a barra inteira travada por um instante a cada página.
   */
  it('não tranca nada enquanto a resposta não chega', () => {
    vi.mocked(api.get).mockImplementation((() => new Promise(() => {})) as never)
    renderComo('DESIGNER')

    expect(link(/^artes$/i)).toBeInTheDocument()
    expect(link(/^feedbacks$/i)).toBeInTheDocument()
  })

  /**
   * Este é o teste que faltava quando os cadeados passaram no vitest e não
   * apareceram no navegador.
   *
   * O StrictMode monta, desmonta e remonta o efeito antes que a primeira
   * resposta chegue. Com a trava de "busca em voo" num ref do componente, a
   * primeira execução era descartada pelo cleanup e a segunda desistia porque
   * o ref continuava marcado: nenhum contador, nenhum cadeado. As requisições
   * saíam — o que despistava — mas o resultado nunca virava estado.
   */
  it('tranca também quando o efeito é remontado em série (StrictMode)', async () => {
    contaCom({ projetos: 0, artes: 0 })
    mockUser.atual = { tipo: 'DESIGNER' }
    render(
      <StrictMode>
        <Sidebar />
      </StrictMode>,
    )

    await waitFor(() => expect(bloqueado(/^artes$/i)).toBe(true))
  })
})
