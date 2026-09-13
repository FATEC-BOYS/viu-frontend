import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SeloLicenca, { SeloLicencaCompacto, type Licenca } from '../SeloLicenca'

/**
 * O selo diz se a peça pode ser usada — cláusula 7.1 do anexo.
 *
 * Duas coisas o teste trava: que ele não apareça onde não há fato, e que a
 * frase fale da licença e não da dívida. O link público é aberto por quem o
 * designer quiser, e uma acusação de calote na cara de quem não tem nada a ver
 * com o pagamento é pior do que não dizer nada.
 */

const q = (extra: Partial<Licenca> = {}): Licenca => ({
  estado: 'QUITADO',
  quitadoEm: '2026-09-13T10:00:00.000Z',
  ...extra,
})

describe('quando o selo aparece', () => {
  it('quitado diz que o uso está licenciado, com a data', () => {
    render(<SeloLicenca licenca={q()} />)
    expect(screen.getByText(/Uso licenciado/)).toBeInTheDocument()
    expect(screen.getByText(/13\/09\/2026/)).toBeInTheDocument()
  })

  it('quitado sem data ainda diz que está licenciado', () => {
    render(<SeloLicenca licenca={q({ quitadoEm: null })} />)
    expect(screen.getByText(/Uso licenciado/)).toBeInTheDocument()
  })

  it('em aberto explica a regra em vez de cobrar', () => {
    render(<SeloLicenca licenca={{ estado: 'EM_ABERTO', quitadoEm: null }} />)
    expect(screen.getByText(/ainda não licenciado/)).toBeInTheDocument()
    expect(screen.getByText(/começa com a quitação/)).toBeInTheDocument()
  })

  it('estornado diz que o pagamento voltou', () => {
    render(<SeloLicenca licenca={{ estado: 'ESTORNADO', quitadoEm: null }} />)
    expect(screen.getByText(/não licenciado/)).toBeInTheDocument()
    expect(screen.getByText(/estornado/)).toBeInTheDocument()
  })
})

describe('quando não aparece', () => {
  it('projeto sem fatura não ganha selo', () => {
    // Rotular toda peça sem cobrança como "não licenciada" seria editorializar
    // onde não há fato: cortesia e trabalho ainda não faturado cairiam no mesmo
    // aviso.
    const { container } = render(<SeloLicenca licenca={{ estado: 'NAO_FATURADO', quitadoEm: null }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('sem dado de licença também não', () => {
    // Endpoint antigo, resposta em cache, projeto sem fatura — em todos, calar
    // é melhor que chutar.
    expect(render(<SeloLicenca licenca={null} />).container).toBeEmptyDOMElement()
    expect(render(<SeloLicenca licenca={undefined} />).container).toBeEmptyDOMElement()
  })
})

describe('o tom da frase', () => {
  const naoLicenciados: Licenca[] = [
    { estado: 'EM_ABERTO', quitadoEm: null },
    { estado: 'ESTORNADO', quitadoEm: null },
  ]

  it('nunca acusa quem está lendo', () => {
    for (const licenca of naoLicenciados) {
      const { container, unmount } = render(<SeloLicenca licenca={licenca} />)
      const texto = container.textContent ?? ''
      // A frase é sobre a peça, não sobre a pessoa.
      expect(texto).not.toMatch(/você|inadimpl|calote|devedor|atraso|d[íi]vida/i)
      unmount()
    }
  })

  it('não manda pagar — o selo informa, não cobra', () => {
    for (const licenca of naoLicenciados) {
      const { container, unmount } = render(<SeloLicenca licenca={licenca} />)
      expect(container.textContent ?? '').not.toMatch(/pague|pagar agora|quite já/i)
      unmount()
    }
  })
})

describe('a versão compacta', () => {
  it('mostra o rótulo curto e guarda a explicação no title', () => {
    render(<SeloLicencaCompacto licenca={{ estado: 'EM_ABERTO', quitadoEm: null }} />)
    const selo = screen.getByText(/ainda não licenciado/)
    expect(selo).toBeInTheDocument()
    expect(selo.getAttribute('title')).toMatch(/começa com a quitação/)
  })

  it('some junto com a versão completa quando não há fatura', () => {
    const { container } = render(
      <SeloLicencaCompacto licenca={{ estado: 'NAO_FATURADO', quitadoEm: null }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

/**
 * O selo no link público.
 *
 * Ele nasceu certo na intenção — fala da licença, não da dívida — e errado no
 * alcance: contava a data da quitação e dizia que o pagamento tinha sido
 * estornado, para qualquer pessoa com o link. Link é encaminhado.
 */
describe('o que o selo conta fora do projeto', () => {
  it('não menciona fatura para quem abriu o link', () => {
    render(<SeloLicenca licenca={{ estado: 'EM_ABERTO', quitadoEm: null }} contexto="publico" />)
    expect(screen.getByText(/Uso ainda não licenciado/i)).toBeInTheDocument()
    expect(screen.queryByText(/fatura/i)).not.toBeInTheDocument()
  })

  it('para as partes do projeto, diz o motivo — lá o aviso é acionável', () => {
    render(<SeloLicenca licenca={{ estado: 'EM_ABERTO', quitadoEm: null }} contexto="partes" />)
    expect(screen.getByText(/quitação da fatura/i)).toBeInTheDocument()
  })

  it('não mostra a data de quitação no link público', () => {
    render(
      <SeloLicenca
        licenca={{ estado: 'QUITADO', quitadoEm: '2026-09-13T10:00:00.000Z' }}
        contexto="publico"
      />,
    )
    expect(screen.getByText(/Uso licenciado/i)).toBeInTheDocument()
    expect(screen.queryByText(/13\/09\/2026/)).not.toBeInTheDocument()
  })

  it('o padrão é a versão das partes — o público é escolha explícita', () => {
    // Errar para o lado de contar demais é o defeito que se está consertando;
    // o componente exige que a tela pública se declare.
    render(<SeloLicenca licenca={{ estado: 'QUITADO', quitadoEm: '2026-09-13T10:00:00.000Z' }} />)
    expect(screen.getByText(/13\/09\/2026/)).toBeInTheDocument()
  })

  it('licenciado continua legível no link — a resposta útil não se perde', () => {
    render(<SeloLicenca licenca={{ estado: 'QUITADO', quitadoEm: null }} contexto="publico" />)
    expect(screen.getByText(/pode ser usada/i)).toBeInTheDocument()
  })
})
