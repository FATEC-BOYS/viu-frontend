import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * A frase que a pessoa lê quando a validação recusa um campo.
 *
 * O backend responde `{ message: 'Dados da requisição inválidos', errors: [{
 * field, message }] }`. A do topo é igual para qualquer recusa; a útil está em
 * `errors`. Como todo `toast.error(erro.message)` lia só o topo, quem digitava
 * uma chave PIX errada recebia "Dados da requisição inválidos" e tinha que
 * adivinhar qual campo corrigir.
 *
 * Conferido contra o servidor: `POST /chaves-pix` com `tipo: 'CPF'` e
 * `chave: 'banana'` devolve exatamente essa forma, com "CPF inválido" dentro
 * de `errors`.
 */
const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})
afterEach(() => vi.unstubAllGlobals())

function resposta(body: unknown, status = 400) {
  return {
    ok: false,
    status,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(body),
    json: async () => body,
  }
}

async function pedir() {
  const { api } = await import('../api')
  return api.post('/chaves-pix', { tipo: 'CPF', chave: 'banana', titular: 'Ana' })
}

describe('Erro de validação chega legível', () => {
  it('usa a frase do campo, não a genérica do topo', async () => {
    fetchMock.mockResolvedValue(
      resposta({
        message: 'Dados da requisição inválidos',
        errors: [{ field: 'chave', message: 'CPF inválido' }],
        success: false,
      }),
    )

    await expect(pedir()).rejects.toThrow('CPF inválido')
  })

  it('junta as frases quando mais de um campo é recusado', async () => {
    fetchMock.mockResolvedValue(
      resposta({
        message: 'Dados da requisição inválidos',
        errors: [
          { field: 'chave', message: 'CPF inválido' },
          { field: 'titular', message: 'Nome do titular é obrigatório' },
        ],
        success: false,
      }),
    )

    await expect(pedir()).rejects.toThrow(/CPF inválido.*Nome do titular/)
  })

  it('mantém a frase do topo quando não há detalhe de campo', async () => {
    // Nem toda recusa é de validação: saldo insuficiente, por exemplo, vem só
    // com a mensagem — e ela já é a útil.
    fetchMock.mockResolvedValue(
      resposta({ message: 'Saldo insuficiente para o saque solicitado', success: false }),
    )

    await expect(pedir()).rejects.toThrow('Saldo insuficiente')
  })

  it('não quebra com `errors` em formato inesperado', async () => {
    fetchMock.mockResolvedValue(
      resposta({ message: 'Dados da requisição inválidos', errors: 'nao-e-lista', success: false }),
    )

    await expect(pedir()).rejects.toThrow('Dados da requisição inválidos')
  })
})
