import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LinkIndisponivel from '../LinkIndisponivel'

/**
 * Antes isto era `notFound()` — página em branco, igual para revogado,
 * expirado, limite atingido e token que nunca existiu. O cliente abria no
 * celular, via nada, e voltava para o WhatsApp dizendo "não abriu".
 *
 * Cada motivo tem um próximo passo diferente. É isso que estes testes travam.
 */
describe('a tela de link que não abre', () => {
  it('expirado diz a data, quando o servidor manda', () => {
    // "Expirou em 12/09" deixa a pessoa pedir outro sem parecer perdida;
    // "expirou" sozinho não diz se foi ontem ou em março.
    render(<LinkIndisponivel motivo="EXPIRADO" expiraEm="2026-09-12T10:00:00.000Z" />)
    expect(screen.getByText(/expirou em 12\/09\/2026/i)).toBeInTheDocument()
  })

  it('expirado sem data ainda faz sentido', () => {
    render(<LinkIndisponivel motivo="EXPIRADO" />)
    expect(screen.getByText(/expirou/i)).toBeInTheDocument()
    expect(screen.queryByText(/Invalid Date|NaN/)).not.toBeInTheDocument()
  })

  it('revogado não é confundido com expirado — foi alguém que agiu', () => {
    render(<LinkIndisponivel motivo="REVOGADO" />)
    expect(screen.getByText(/desativado/i)).toBeInTheDocument()
    expect(screen.queryByText(/expirou/i)).not.toBeInTheDocument()
  })

  it('limite atingido explica que o link tinha um teto', () => {
    render(<LinkIndisponivel motivo="LIMITE_ATINGIDO" />)
    expect(screen.getByText(/limite de aberturas/i)).toBeInTheDocument()
  })

  it('token inexistente sugere conferir o endereço', () => {
    render(<LinkIndisponivel motivo="NAO_ENCONTRADO" />)
    expect(screen.getByText(/copiado inteiro/i)).toBeInTheDocument()
  })

  it('todo motivo diz o PRÓXIMO PASSO, não só o diagnóstico', () => {
    /*
     * Quem está do outro lado não pode renovar nada sozinho: o próximo passo é
     * sempre falar com quem enviou. Tela que só diagnostica deixa a pessoa
     * parada.
     */
    const motivos = ['EXPIRADO', 'REVOGADO', 'LIMITE_ATINGIDO', 'NAO_ENCONTRADO'] as const
    for (const motivo of motivos) {
      const { unmount } = render(<LinkIndisponivel motivo={motivo} />)
      expect(screen.getByText(/peça|confira|fale com/i)).toBeInTheDocument()
      unmount()
    }
  })

  it('não oferece "entrar" — quem chega aqui provavelmente não tem conta', () => {
    // Seria mandar a pessoa para outra porta fechada.
    render(<LinkIndisponivel motivo="EXPIRADO" />)
    expect(screen.queryByRole('link', { name: /entrar|login/i })).not.toBeInTheDocument()
  })

  it('motivo desconhecido cai no genérico em vez de quebrar', () => {
    // O backend pode ganhar um motivo novo antes do front.
    render(<LinkIndisponivel motivo={'INVENTADO' as any} />)
    expect(screen.getByText(/não encontramos/i)).toBeInTheDocument()
  })
})
