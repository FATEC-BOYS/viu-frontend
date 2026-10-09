import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))

const get = vi.fn()
vi.mock('@/lib/api', () => ({ api: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }))

function Sonda() {
  const { user, loading } = useAuth()
  if (loading) return <span>carregando</span>
  return <span>{user ? `logada: ${user.nome}` : 'anônima'}</span>
}

function erroDe(status: number) {
  return Object.assign(new Error('falhou'), { status, body: null })
}

const PERFIL = { id: 'u1', nome: 'Ana Silva', email: 'ana@viu.com', tipo: 'DESIGNER' }

/*
 * Ser deslogada do nada foi o relato que abriu este trabalho, e a sondagem de
 * sessão é um dos caminhos: `/auth/me` falha, o `.catch` derruba o perfil, e a
 * interface passa a se comportar como se a pessoa fosse visitante.
 *
 * O que separa os casos é o status. 401 é o servidor dizendo "você não está
 * logada" — resposta legítima, e aí limpar é certo. Qualquer outra falha
 * significa "não deu para perguntar", e a sessão pode estar perfeitamente boa.
 */
describe('AuthProvider: falha ao sondar a sessão', () => {
  beforeEach(() => {
    get.mockReset()
    localStorage.clear()
    localStorage.setItem('viu_user', JSON.stringify(PERFIL))
  })

  it('401 em /auth/me significa visitante: limpa o perfil', async () => {
    get.mockRejectedValue(erroDe(401))
    render(<AuthProvider><Sonda /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('anônima')).toBeInTheDocument())
    expect(localStorage.getItem('viu_user')).toBeNull()
  })

  it('rede caída não é visitante: o perfil em cache fica', async () => {
    // `buscar` traduz falha de rede em erro com status 0.
    get.mockRejectedValue(erroDe(0))
    render(<AuthProvider><Sonda /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('logada: Ana Silva')).toBeInTheDocument())
    expect(localStorage.getItem('viu_user')).not.toBeNull()
  })

  it('renovação indisponível não é visitante: o perfil em cache fica', async () => {
    /*
     * O caso composto, e o que escapava: o token de acesso venceu (401 na
     * chamada) E a renovação não respondeu (5xx/429). O cliente HTTP lançava
     * 401 nos dois desfechos, então o filtro aqui lia "visitante" e apagava o
     * perfil de quem tinha sessão boa. Agora esse desfecho vem como 503.
     */
    get.mockRejectedValue(erroDe(503))
    render(<AuthProvider><Sonda /></AuthProvider>)

    await waitFor(() => expect(screen.getByText('logada: Ana Silva')).toBeInTheDocument())
    expect(localStorage.getItem('viu_user')).not.toBeNull()
  })
})
