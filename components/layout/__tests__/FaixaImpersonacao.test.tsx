import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FaixaImpersonacao } from '../FaixaImpersonacao'

const authFalso = vi.hoisted(() => ({ user: null as any, recarregar: vi.fn() }))
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authFalso }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/impersonacao', () => ({ impersonacaoApi: { sair: vi.fn(), entrar: vi.fn() } }))

const CLIENTE = {
  id: 'c1',
  nome: 'João Santos',
  email: 'joao@empresa.com',
  tipo: 'CLIENTE' as const,
}
const IMP = { adminId: 'a1', adminNome: 'Carlos Admin', adminEmail: 'admin@viu.com' }

beforeEach(() => {
  vi.clearAllMocks()
  authFalso.user = null
})

/**
 * O risco real da impersonação não é o admin mal-intencionado — é o distraído:
 * abrir para investigar um caso, atender outra coisa, e meia hora depois estar
 * lendo a conta alheia achando que é a própria.
 */
describe('a faixa de impersonação', () => {
  it('não aparece em sessão comum', () => {
    authFalso.user = { ...CLIENTE }
    const { container } = render(<FaixaImpersonacao />)
    expect(container).toBeEmptyDOMElement()
  })

  it('não aparece para visitante sem sessão', () => {
    authFalso.user = null
    const { container } = render(<FaixaImpersonacao />)
    expect(container).toBeEmptyDOMElement()
  })

  it('diz em qual conta a pessoa está', () => {
    authFalso.user = { ...CLIENTE, impersonacao: IMP }
    render(<FaixaImpersonacao />)
    expect(screen.getByText('João Santos')).toBeInTheDocument()
    expect(screen.getByText(/joao@empresa\.com/)).toBeInTheDocument()
  })

  it('diz que é somente leitura ANTES de a pessoa tentar escrever', () => {
    // Descobrir o limite ao levar um 403 no meio de uma ação é descobrir tarde.
    authFalso.user = { ...CLIENTE, impersonacao: IMP }
    render(<FaixaImpersonacao />)
    expect(screen.getByText(/somente leitura/i)).toBeInTheDocument()
  })

  it('nomeia quem abriu o acesso', () => {
    authFalso.user = { ...CLIENTE, impersonacao: IMP }
    render(<FaixaImpersonacao />)
    expect(screen.getByText(/Carlos Admin/)).toBeInTheDocument()
  })

  it('oferece a saída na própria faixa', () => {
    // Quem precisa sair está, por definição, dentro da outra conta — e lá não
    // existe menu de admin para clicar.
    authFalso.user = { ...CLIENTE, impersonacao: IMP }
    render(<FaixaImpersonacao />)
    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument()
  })

  it('não pode ser fechada — aviso dispensável é dispensado no primeiro minuto', () => {
    authFalso.user = { ...CLIENTE, impersonacao: IMP }
    render(<FaixaImpersonacao />)
    const botoes = screen.getAllByRole('button')
    expect(botoes).toHaveLength(1)
    expect(botoes[0]).toHaveAccessibleName(/sair da conta/i)
  })
})
