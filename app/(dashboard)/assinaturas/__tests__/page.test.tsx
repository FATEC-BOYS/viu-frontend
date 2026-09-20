import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/components/layout/Motion', () => ({
  FadeIn: ({ children, className }: any) => <div className={className}>{children}</div>,
}))
vi.mock('@/components/layout/PageHeader', () => ({
  default: ({ title }: any) => <h1>{title}</h1>,
}))
vi.mock('framer-motion', async () =>
  (await import('@/test-utils/framerMotion')).mockDeFramerMotion(),
)
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const getMinhaAssinatura = vi.fn()
const cancelarAssinatura = vi.fn()
vi.mock('@/lib/pagamentos', async () => {
  const real = await vi.importActual<any>('@/lib/pagamentos')
  return {
    ...real,
    pagamentosApi: {
      getMinhaAssinatura: () => getMinhaAssinatura(),
      cancelarAssinatura: (...a: any[]) => cancelarAssinatura(...a),
    },
  }
})

import AssinaturaPage from '../page'

const GRATUITO = {
  id: 'p0',
  nome: 'Gratuito',
  precoMensal: 0,
  precoMensalFormatado: 'R$ 0,00',
  taxaPlataforma: 0.1,
  taxaPlataformaFormatada: '10%',
  limitesProjetos: 3,
  limitesArtes: 20,
}
const PRO = {
  id: 'p1',
  nome: 'Profissional',
  precoMensal: 4900,
  precoMensalFormatado: 'R$ 49,00',
  taxaPlataforma: 0.05,
  taxaPlataformaFormatada: '5%',
  limitesProjetos: null,
  limitesArtes: null,
}

function assinada(extra: Record<string, unknown> = {}) {
  return {
    assinatura: {
      id: 'a1',
      status: 'ATIVA',
      renovacaoAutomatica: true,
      periodoInicio: '2026-09-17T00:00:00.000Z',
      periodoFim: '2026-10-17T00:00:00.000Z',
      plano: PRO,
    },
    plano: PRO,
    vigenteAte: null,
    cancelada: false,
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  getMinhaAssinatura.mockResolvedValue({ data: assinada() })
  cancelarAssinatura.mockResolvedValue({ success: true })
})

describe('A tela de assinatura', () => {
  /* Era o campo mais visível do cartão e desenhava em branco: `getMinhaAssinatura`
     devolvia a linha crua do Prisma, sem os campos formatados. */
  it('mostra a taxa da plataforma, que antes vinha em branco', async () => {
    render(<AssinaturaPage />)
    expect(await screen.findByText('5%')).toBeInTheDocument()
  })

  /*
   * O `null` do servidor chegava tanto para quem nunca assinou quanto para
   * quem acabou de cancelar, e a tela lia como "não tem plano".
   */
  it('mostra o Gratuito de quem não assinou nada, em vez de "não tem assinatura"', async () => {
    getMinhaAssinatura.mockResolvedValue({
      data: { assinatura: null, plano: GRATUITO, vigenteAte: null, cancelada: false },
    })
    render(<AssinaturaPage />)

    expect(await screen.findByText('Gratuito')).toBeInTheDocument()
    expect(screen.queryByText(/ainda não tem uma assinatura/i)).not.toBeInTheDocument()
  })

  /* Sem contratação, três dos quatro campos eram "—" ou "Não se aplica".
     O que interessa a quem está no Gratuito é onde ele esbarra. */
  it('troca as datas vazias pelos limites quando não há contratação', async () => {
    getMinhaAssinatura.mockResolvedValue({
      data: { assinatura: null, plano: GRATUITO, vigenteAte: null, cancelada: false },
    })
    render(<AssinaturaPage />)

    expect(await screen.findByText('Projetos')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.queryByText(/Próxima cobrança|Renovação automática/)).not.toBeInTheDocument()
  })

  /* O rótulo anunciava "Próxima cobrança" numa assinatura cancelada — uma
     cobrança que não vai acontecer. */
  it('chama a data de "Vale até" quando a renovação está desligada', async () => {
    getMinhaAssinatura.mockResolvedValue({
      data: assinada({
        assinatura: { ...assinada().assinatura, renovacaoAutomatica: false },
        cancelada: true,
        vigenteAte: '2026-10-17T00:00:00.000Z',
      }),
    })
    render(<AssinaturaPage />)

    expect(await screen.findByText('Vale até')).toBeInTheDocument()
    expect(screen.queryByText('Próxima cobrança')).not.toBeInTheDocument()
  })

  /*
   * Falha de rede virava "você não tem assinatura" com um convite para
   * contratar o plano que a pessoa já paga.
   */
  it('mostra erro quando a leitura falha, em vez de dizer que não há plano', async () => {
    getMinhaAssinatura.mockRejectedValue(new Error('Servidor fora do ar'))
    render(<AssinaturaPage />)

    expect(await screen.findByText(/Não foi possível carregar/i)).toBeInTheDocument()
    expect(screen.getByText('Servidor fora do ar')).toBeInTheDocument()
    expect(screen.queryByText(/ainda não tem uma assinatura/i)).not.toBeInTheDocument()
  })

  it('o diálogo promete o que o servidor faz: vale até a data paga', async () => {
    const user = userEvent.setup()
    render(<AssinaturaPage />)
    await user.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent(/continua valendo até/i)
    expect(dialogo).toHaveTextContent(/Gratuito/)
    // A frase antiga prometia o fim do período pago e o código cortava na hora.
    expect(dialogo).not.toHaveTextContent(/perderá acesso aos recursos premium/i)
  })

  /*
   * A tela remendava o status localmente e mantinha o resto: uma assinatura
   * recém-cancelada seguia anunciando "Renovação automática: Ativada".
   */
  it('relê do servidor depois de cancelar, em vez de remendar o estado', async () => {
    const user = userEvent.setup()
    render(<AssinaturaPage />)
    await user.click(await screen.findByRole('button', { name: 'Cancelar assinatura' }))

    getMinhaAssinatura.mockResolvedValue({
      data: assinada({
        assinatura: { ...assinada().assinatura, renovacaoAutomatica: false },
        cancelada: true,
        vigenteAte: '2026-10-17T00:00:00.000Z',
      }),
    })
    await user.click(screen.getByRole('button', { name: /Sim, cancelar/i }))

    await waitFor(() => expect(cancelarAssinatura).toHaveBeenCalledWith('a1'))
    // Duas leituras: a da montagem e a de depois do cancelamento.
    await waitFor(() => expect(getMinhaAssinatura).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Desativada')).toBeInTheDocument()
  })

  /* Não há o que cancelar no Gratuito — ele é o piso, não uma contratação. */
  it('não oferece cancelar para quem está no Gratuito', async () => {
    getMinhaAssinatura.mockResolvedValue({
      data: { assinatura: null, plano: GRATUITO, vigenteAte: null, cancelada: false },
    })
    render(<AssinaturaPage />)

    await screen.findByText('Gratuito')
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
    // Mas oferece para onde subir, que era o que faltava.
    expect(screen.getByRole('button', { name: /Ver planos disponíveis/i })).toBeInTheDocument()
  })
})
