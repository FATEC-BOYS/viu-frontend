import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminHomePage from '../page'

/**
 * A home do admin.
 *
 * O que estes testes protegem é sobretudo a honestidade da tela: "—" para o
 * que não sabemos medir, e nunca 0 — zero é uma medição, e mostrar zero no
 * lugar de "não medimos" é mentir com cara de dado.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: any) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('@/lib/admin', () => ({ adminApi: { resumo: vi.fn() } }))

import { adminApi } from '@/lib/admin'

const RESUMO = {
  periodo: {
    fuso: 'America/Sao_Paulo',
    inicioDoDia: '2026-09-09T03:00:00.000Z',
    funilDesde: '2026-09-03T03:00:00.000Z',
    geradoEm: '2026-09-09T12:00:00.000Z',
  },
  hoje: {
    contasNovas: 4, projetosCriados: 2, artesEnviadas: 7, linksGerados: 5,
    feedbacksCriados: 12, aprovacoesSolicitadas: 3, aprovacoesDecididas: 1,
  },
  funil: { janelaDias: 7, criados: 18, abertos: 11, comFeedback: 6, comDecisao: 3 },
  precisaDeVoce: { saquesPendentes: 2, disputasAbertas: 1, linksTravados: 4 },
  fila: [
    { tipo: 'DISPUTA', id: 'd1', titulo: 'Rebrand FitTracker', status: 'EM_ANALISE',
      criadoEm: '2026-09-07T09:00:00.000Z', href: '/disputas' },
  ],
  usuariosRecentes: [
    { id: 'u1', nome: 'João Santos', email: 'joao@empresa.com', tipo: 'CLIENTE',
      emailVerificado: false, criadoEm: '2026-09-08T12:00:00.000Z' },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(adminApi.resumo).mockResolvedValue({ data: RESUMO, success: true } as never)
})

describe('carregada', () => {
  // O número é lido pelo rótulo ao lado, não solto na tela: "4" aparece em
  // mais de um card, e um getByText('4') passaria pelo motivo errado.
  const valorDe = (rotulo: HTMLElement) => rotulo.previousElementSibling

  it('mostra o pulso do dia', async () => {
    render(<AdminHomePage />)

    expect(valorDe(await screen.findByText('contas novas'))).toHaveTextContent('4')
    expect(valorDe(screen.getByText('feedbacks'))).toHaveTextContent('12')
    expect(valorDe(screen.getByText('links criados'))).toHaveTextContent('18')
  })

  it('mostra as decisões do dia', async () => {
    render(<AdminHomePage />)
    expect(valorDe(await screen.findByText('aprovações decididas'))).toHaveTextContent('1')
  })

  /**
   * A regra vale para qualquer métrica: `null` é ausência de medição e vira
   * "—"; zero é uma medição e vira 0. Trocar um pelo outro é mentir com
   * aparência de dado.
   */
  it('mostra "—" quando a métrica não veio, e 0 quando veio zerada', async () => {
    vi.mocked(adminApi.resumo).mockResolvedValue({
      data: { ...RESUMO, hoje: { ...RESUMO.hoje, aprovacoesDecididas: null, contasNovas: 0 } },
      success: true,
    } as never)

    render(<AdminHomePage />)
    expect(valorDe(await screen.findByText('aprovações decididas'))).toHaveTextContent('—')
    expect(valorDe(screen.getByText('contas novas'))).toHaveTextContent('0')
  })

  it('leva a fila para a tela de quem resolve', async () => {
    render(<AdminHomePage />)
    const item = await screen.findByText('Rebrand FitTracker')
    expect(item.closest('a')).toHaveAttribute('href', '/disputas')
    expect(screen.getByText(/saques a moderar/i).closest('a')).toHaveAttribute('href', '/admin/saques')
  })

  it('marca quem ainda não confirmou o e-mail', async () => {
    render(<AdminHomePage />)
    expect(await screen.findByText(/e-mail pendente/i)).toBeInTheDocument()
  })

  it('declara o fuso em que "hoje" foi contado', async () => {
    render(<AdminHomePage />)
    expect(await screen.findByText(/America\/Sao Paulo/)).toBeInTheDocument()
  })
})

describe('estados', () => {
  it('mostra "Nada na fila" quando não há nada esperando', async () => {
    vi.mocked(adminApi.resumo).mockResolvedValue({
      data: { ...RESUMO, fila: [] }, success: true,
    } as never)

    render(<AdminHomePage />)
    expect(await screen.findByText(/nada na fila/i)).toBeInTheDocument()
  })

  it('explica a falha e deixa tentar de novo', async () => {
    vi.mocked(adminApi.resumo).mockRejectedValueOnce(new Error('Erro 500'))
    const user = userEvent.setup()

    render(<AdminHomePage />)
    expect(await screen.findByText('Erro 500')).toBeInTheDocument()

    vi.mocked(adminApi.resumo).mockResolvedValue({ data: RESUMO, success: true } as never)
    await user.click(screen.getByRole('button', { name: /tentar de novo/i }))

    await waitFor(() => expect(screen.getByText('contas novas')).toBeInTheDocument())
  })
})
