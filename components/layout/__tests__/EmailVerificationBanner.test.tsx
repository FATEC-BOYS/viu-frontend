import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailVerificationBanner } from '../EmailVerificationBanner'

/**
 * O aviso de e-mail não confirmado.
 *
 * Duas coisas que ele precisa acertar: dizer para qual endereço o link foi
 * (quem digitou errado no cadastro não tinha como perceber) e conseguir
 * reconhecer a confirmação, que acontece em OUTRA aba — a do link. Sem
 * reconsultar o servidor, esta aba seguiria mostrando o aviso e a pessoa
 * concluiria que a confirmação não pegou.
 */

const auth = vi.hoisted(() => ({
  user: null as { email: string; emailVerificado?: boolean } | null,
  recarregar: vi.fn(),
}))

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }))
vi.mock('@/lib/api', () => ({ api: { post: vi.fn().mockResolvedValue({}) } }))

import { api } from '@/lib/api'

beforeEach(() => {
  vi.clearAllMocks()
  auth.user = { email: 'ana@estudio.com', emailVerificado: false }
  auth.recarregar = vi.fn().mockResolvedValue({ email: 'ana@estudio.com', emailVerificado: false })
})

it('não aparece para quem já confirmou', () => {
  auth.user = { email: 'ana@estudio.com', emailVerificado: true }
  const { container } = render(<EmailVerificationBanner />)
  expect(container).toBeEmptyDOMElement()
})

it('não aparece para visitante sem sessão', () => {
  auth.user = null
  const { container } = render(<EmailVerificationBanner />)
  expect(container).toBeEmptyDOMElement()
})

it('diz para qual endereço o link foi', () => {
  render(<EmailVerificationBanner />)
  expect(screen.getByText(/ana@estudio\.com/)).toBeInTheDocument()
})

describe('já verifiquei', () => {
  it('reconsulta o servidor em vez de confiar no estado local', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner />)

    await user.click(screen.getByRole('button', { name: /já verifiquei/i }))

    await waitFor(() => expect(auth.recarregar).toHaveBeenCalledOnce())
  })

  it('avisa quando ainda não confirmou, em vez de fingir sucesso', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner />)

    await user.click(screen.getByRole('button', { name: /já verifiquei/i }))

    expect(await screen.findByText(/ainda não confirmamos/i)).toBeInTheDocument()
  })
})

describe('reenviar', () => {
  it('pede novo link para o e-mail da sessão', async () => {
    const user = userEvent.setup()
    render(<EmailVerificationBanner />)

    await user.click(screen.getByRole('button', { name: /reenviar/i }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', {
        email: 'ana@estudio.com',
      }),
    )
    expect(await screen.findByText(/link reenviado para ana@estudio\.com/i)).toBeInTheDocument()
  })

  /**
   * O servidor responde igual para e-mail existente ou não (anti-enumeração).
   * Mostrar erro aqui entregaria justamente o que ele esconde.
   */
  it('confirma o envio mesmo quando a chamada falha', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('500'))
    const user = userEvent.setup()
    render(<EmailVerificationBanner />)

    await user.click(screen.getByRole('button', { name: /reenviar/i }))

    expect(await screen.findByText(/link reenviado/i)).toBeInTheDocument()
  })
})
