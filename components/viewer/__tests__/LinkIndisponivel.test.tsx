import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LinkIndisponivel, { motivoDaResposta } from '../LinkIndisponivel'

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

/*
 * "O link está ruim" e "nós falhamos" não podem sair iguais.
 *
 * Qualquer falha virava `NAO_ENCONTRADO`, e o cliente lia que o endereço
 * estava errado. Ele então cobrava um link novo de quem já tinha mandado o
 * certo, o designer parecia desleixado por um erro nosso, e nenhum dos dois
 * ficava sabendo que houve erro — do outro lado, parecia um link vencido
 * comum.
 */
describe('falha nossa não pode parecer link ruim', () => {
  it('não acusa o link nem manda cobrar quem enviou', () => {
    render(<LinkIndisponivel motivo="FALHA_TEMPORARIA" />)

    expect(screen.getByText(/não conseguimos abrir/i)).toBeInTheDocument()
    expect(screen.queryByText(/não encontramos esta arte/i)).not.toBeInTheDocument()
    // O conselho dos outros motivos é sempre "peça outro a quem enviou", e
    // aqui ele seria errado: o link está bom.
    expect(screen.queryByText(/peça (um link novo|outro)/i)).not.toBeInTheDocument()
  })

  it('diz de quem é o problema, para o designer não levar a culpa', () => {
    render(<LinkIndisponivel motivo="FALHA_TEMPORARIA" />)
    expect(screen.getByText(/do nosso lado/i)).toBeInTheDocument()
  })

  it('oferece insistir — o único motivo em que isso resolve', () => {
    render(<LinkIndisponivel motivo="FALHA_TEMPORARIA" tentarEm="/l/abc123" />)
    const botao = screen.getByRole('link', { name: /tentar de novo/i })
    expect(botao.getAttribute('href')).toBe('/l/abc123')
  })

  it('nos outros motivos, insistir não aparece: não adiantaria', () => {
    for (const motivo of ['EXPIRADO', 'REVOGADO', 'LIMITE_ATINGIDO', 'NAO_ENCONTRADO'] as const) {
      const { unmount } = render(<LinkIndisponivel motivo={motivo} tentarEm="/l/abc123" />)
      expect(screen.queryByRole('link', { name: /tentar de novo/i })).not.toBeInTheDocument()
      unmount()
    }
  })
})

/*
 * A classificação é por lista de PERMISSÃO, e a diferença é prática.
 *
 * A primeira versão perguntava "é 5xx?" para decidir falha nossa. Só que o
 * backend manda `motivo` apenas quando quem recusou foi o link — 404 para
 * inexistente, 410 para revogado, expirado e limite. Um 429 do limitador nem
 * passa por esse handler: vem sem motivo, escapava do `>= 500`, e a tela
 * voltava a dizer "endereço errado" sobre um link perfeitamente bom.
 */
describe('motivoDaResposta: só o link acusa o link', () => {
  it.each(['NAO_ENCONTRADO', 'REVOGADO', 'EXPIRADO', 'LIMITE_ATINGIDO', 'TIPO_NAO_SUPORTADO'])(
    'motivo %s vem do backend e é respeitado',
    (motivo) => {
      expect(motivoDaResposta({ motivo, success: false })).toBe(motivo)
    },
  )

  it('429 do limitador não tem motivo: é falha nossa', () => {
    // O corpo do rate limit, como o backend o monta.
    const corpo = { statusCode: 429, error: 'Too Many Requests', message: 'Muitas tentativas. Espere 2 minutos e tente de novo.', success: false }
    expect(motivoDaResposta(corpo)).toBe('FALHA_TEMPORARIA')
  })

  it('500 sem motivo também', () => {
    expect(motivoDaResposta({ message: 'Erro ao abrir o link', success: false })).toBe('FALHA_TEMPORARIA')
  })

  it('corpo que nem é JSON cai do lado certo', () => {
    expect(motivoDaResposta(null)).toBe('FALHA_TEMPORARIA')
  })

  it('motivo desconhecido não vira tela de link ruim por engano', () => {
    // Se o backend inventar um motivo antes do front conhecer, o conservador
    // é não acusar o link: pedir para tentar de novo não culpa ninguém.
    expect(motivoDaResposta({ motivo: 'ALGO_NOVO' })).toBe('FALHA_TEMPORARIA')
  })
})
