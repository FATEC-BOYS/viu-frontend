import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BarraDecisao from '../BarraDecisao'

/**
 * No celular — que é como o cliente abre o link — decidir custava três toques
 * e nenhum aviso: a única alça na base dizia "Comentários", a aba "Aprovações"
 * só existia dentro da gaveta, e os botões eram pequenos dentro de um cartão.
 */

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const decidir = vi.fn()
beforeEach(() => decidir.mockReset())

function montar(versaoNumero: number | null = 2) {
  return render(
    <BarraDecisao versaoNumero={versaoNumero} decidindo={false} aoDecidir={decidir} />,
  )
}

describe('BarraDecisao', () => {
  it('diz que é a vez de quem está olhando, e qual versão', () => {
    montar(4)
    expect(screen.getByText(/aguarda sua decisão/i)).toBeInTheDocument()
    expect(screen.getByText('v4')).toBeInTheDocument()
  })

  it('aprovar não exige justificativa', async () => {
    decidir.mockResolvedValue({ ok: true })
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))

    await waitFor(() => expect(decidir).toHaveBeenCalledWith('APROVADO', undefined))
  })

  it('pedir ajustes fica travado até haver motivo', async () => {
    decidir.mockResolvedValue({ ok: true })
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Pedir ajustes' }))
    expect(screen.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('O que precisa mudar?'), 'a fonte ficou ilegível')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }))

    await waitFor(() =>
      expect(decidir).toHaveBeenCalledWith('REJEITADO', 'a fonte ficou ilegível'),
    )
  })

  it('mostra a frase que o backend devolveu quando a decisão não passa', async () => {
    const { toast } = await import('sonner')
    decidir.mockResolvedValue({ ok: false, erro: 'Diga o que precisa mudar para recusar esta versão.' })
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Diga o que precisa mudar para recusar esta versão.'),
    )
  })
})
