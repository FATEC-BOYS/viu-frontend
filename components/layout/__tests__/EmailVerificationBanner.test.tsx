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

/**
 * Uma linha no desktop; no celular, a frase inteira.
 *
 * O `truncate` nasceu de um problema real: e-mail longo esticava a faixa e
 * empurrava os botões para uma segunda e terceira linha no celular, comendo a
 * altura da tela inicial. Truncar resolveu a altura — e criou outro problema,
 * que só apareceu quando alguém finalmente abriu o app num telefone: com os
 * dois botões e o X disputando os 390px, sobravam menos de 150px e a mensagem
 * virava "Confirme seu e-mail: …". O dois-pontos ficava pendurado nas
 * reticências e o endereço — que é o que a pessoa confere para saber se foi
 * para a caixa certa — saía de alcance, porque em tela de toque não existe o
 * hover que revela o `title`.
 *
 * A troca: no celular o texto fica com a linha inteira e os botões descem, ao
 * custo de uma linha a mais de altura. No desktop nada muda — `sm:truncate` e
 * o `title` seguem valendo, que é onde o hover existe.
 */
it('trunca a partir do desktop, e no celular mostra a frase inteira', () => {
  render(<EmailVerificationBanner />)

  const texto = screen.getByText(/confirme seu e-mail/i)
  // `sm:truncate` e não `truncate`: cortar já na menor largura é onde doía.
  expect(texto).toHaveClass('sm:truncate')
  expect(texto).not.toHaveClass('truncate')
  expect(texto).toHaveAttribute('title', expect.stringContaining('ana@estudio.com'))
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
