import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SolicitarAprovacaoDialog from '../SolicitarAprovacaoDialog'

/**
 * O gatilho que faltava no produto: sem ele nada criava Aprovacao e o painel
 * do viewer não tinha como ter conteúdo.
 *
 * O que estes testes travam é o que separa "solicitar" de "decidir": quem
 * clica aqui é o designer, e quem responde é o cliente do projeto. Por isso
 * não há escolha de aprovador — o backend lê o `clienteId` do projeto e
 * ignora qualquer coisa vinda do corpo. Oferecer a escolha seria repetir a
 * mentira que a Frente B removeu.
 */

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/projects', () => ({ solicitarAprovacao: vi.fn() }))
vi.mock('@/lib/artes', () => ({ listVersoes: vi.fn() }))

import { toast } from 'sonner'
import { solicitarAprovacao } from '@/lib/projects'
import { listVersoes } from '@/lib/artes'

const ARTES = [
  { id: 'a1', nome: 'Logo TechStart', versaoAtual: 3 },
  { id: 'a2', nome: 'Cartão de Visita', versaoAtual: 1 },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(listVersoes).mockResolvedValue([])
  vi.mocked(solicitarAprovacao).mockResolvedValue({ id: 'ap1' })
})

async function abrir(artes = ARTES) {
  const user = userEvent.setup()
  render(<SolicitarAprovacaoDialog artes={artes} />)
  await user.click(screen.getByRole('button', { name: /solicitar aprovação/i }))
  return user
}

describe('SolicitarAprovacaoDialog', () => {
  it('não oferece escolher aprovador — quem decide é o cliente do projeto', async () => {
    await abrir()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText(/aprovador/i)).not.toBeInTheDocument()
    expect(screen.getByText(/você não aprova no lugar dele/i)).toBeInTheDocument()
  })

  it('fica desabilitado quando não há arte para aprovar', () => {
    render(<SolicitarAprovacaoDialog artes={[]} />)
    expect(screen.getByRole('button', { name: /solicitar aprovação/i })).toBeDisabled()
  })

  it('só habilita o envio depois de escolher a arte', async () => {
    await abrir()
    expect(screen.getByRole('button', { name: /^solicitar$/i })).toBeDisabled()
  })

  /**
   * `createArte` não cria linha em ArteVersao, então a v1 não aparece em
   * GET /artes/:id/versoes. Sem somá-la por fora, a arte mais comum do
   * sistema ficaria sem nenhuma versão para escolher.
   */
  it('inclui a versão corrente mesmo quando o histórico vem vazio', async () => {
    const user = await abrir()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Logo TechStart/i }))

    await waitFor(() => expect(listVersoes).toHaveBeenCalledWith('a1'))
    expect(await screen.findByText(/v3.*atual/i)).toBeInTheDocument()
  })

  it('não repete a versão corrente quando ela também vem do histórico', async () => {
    vi.mocked(listVersoes).mockResolvedValue([
      { versao: 3, arquivos: [] },
      { versao: 2, arquivos: [] },
    ] as never)

    const user = await abrir()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Logo TechStart/i }))

    await user.click(screen.getAllByRole('combobox')[1])
    const opcoes = await screen.findAllByRole('option')
    const v3 = opcoes.filter((o) => /^v3/.test(o.textContent ?? ''))
    expect(v3).toHaveLength(1)
  })

  it('envia arte e versão, e avisa que o cliente foi notificado', async () => {
    const user = await abrir()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Logo TechStart/i }))
    await waitFor(() => expect(listVersoes).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: /^solicitar$/i }))

    await waitFor(() => expect(solicitarAprovacao).toHaveBeenCalledWith('a1', 3))
    expect(toast.success).toHaveBeenCalledWith(
      'Aprovação solicitada',
      expect.objectContaining({ description: expect.stringMatching(/cliente/i) }),
    )
  })

  it('mostra a mensagem do backend quando ele recusa', async () => {
    vi.mocked(solicitarAprovacao).mockRejectedValue(
      new Error('Acesso negado: apenas o designer do projeto pode solicitar aprovação'),
    )

    const user = await abrir()
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Logo TechStart/i }))
    await waitFor(() => expect(listVersoes).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /^solicitar$/i }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/apenas o designer/i)),
    )
  })

  it('avisa quem depende do resultado para recarregar a lista', async () => {
    const onSolicitado = vi.fn()
    const user = userEvent.setup()
    render(<SolicitarAprovacaoDialog artes={ARTES} onSolicitado={onSolicitado} />)
    await user.click(screen.getByRole('button', { name: /solicitar aprovação/i }))
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: /Logo TechStart/i }))
    await waitFor(() => expect(listVersoes).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: /^solicitar$/i }))

    await waitFor(() => expect(onSolicitado).toHaveBeenCalledOnce())
  })
})
