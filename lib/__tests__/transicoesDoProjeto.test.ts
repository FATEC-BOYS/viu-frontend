import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  getAll: vi.fn(),
  MAX_PAGE_SIZE: 100,
}))
vi.mock('@/lib/artes', () => ({ listVersoes: vi.fn() }))

import { api } from '@/lib/api'
import { updateProjeto } from '../projects'
import {
  TRANSICOES_DO_PROJETO,
  ehTerminal,
  motivoDaRecusa,
  podeIrDe,
} from '../transicoesDoProjeto'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.put).mockResolvedValue({ data: {} } as never)
})

/**
 * O validador do front conhecia 3 dos 5 status.
 *
 * `['EM_ANDAMENTO', 'CONCLUIDO', 'PAUSADO']` — faltavam RASCUNHO e CANCELADO,
 * que o backend grava todo dia (todo projeto de não-admin nasce em RASCUNHO).
 * Medido no app: arrastar um cartão para a coluna "Aguardando aceite" do Board
 * morria aqui, ANTES de qualquer requisição, e a pessoa lia "Não consegui
 * mover, desfazendo…" — um erro de gravação que nunca foi tentada.
 *
 * Contra o código antigo, os dois primeiros testes falham na asserção: a
 * promessa não era "a função não existia", era "o status era inválido".
 */
describe('o front conhece os cinco status', () => {
  it('aceita RASCUNHO e manda para a API', async () => {
    await updateProjeto('p1', { status: 'RASCUNHO' })

    expect(api.put).toHaveBeenCalledTimes(1)
    const [, body] = vi.mocked(api.put).mock.calls[0]
    expect(body).toMatchObject({ status: 'RASCUNHO' })
  })

  it('aceita CANCELADO e manda para a API', async () => {
    await updateProjeto('p1', { status: 'CANCELADO' })

    const [, body] = vi.mocked(api.put).mock.calls[0]
    expect(body).toMatchObject({ status: 'CANCELADO' })
  })

  /*
   * O outro lado: a lista deixou de ser curta, não deixou de existir. Um
   * status inventado continua barrado antes de virar requisição.
   */
  it('recusa status que não existe, sem chamar a API', async () => {
    await expect(
      updateProjeto('p1', { status: 'EM_REVISAO' as never }),
    ).rejects.toThrow('Status inválido')
    expect(api.put).not.toHaveBeenCalled()
  })
})

/**
 * O espelho de `PROJETO_TRANSITIONS` (viu-backend,
 * `src/utils/stateMachine.ts`). Meia cópia é pior que nenhuma: foi meia cópia
 * que produziu o defeito acima.
 */
describe('a tabela espelhada', () => {
  it('tem os cinco status como origem', () => {
    expect(Object.keys(TRANSICOES_DO_PROJETO).sort()).toEqual([
      'CANCELADO',
      'CONCLUIDO',
      'EM_ANDAMENTO',
      'PAUSADO',
      'RASCUNHO',
    ])
  })

  it('não tem ninguém entrando em RASCUNHO', () => {
    const destinos = Object.values(TRANSICOES_DO_PROJETO).flat()
    expect(destinos).not.toContain('RASCUNHO')
  })

  it('só lista destinos que existem como origem', () => {
    const origens = Object.keys(TRANSICOES_DO_PROJETO)
    for (const destino of Object.values(TRANSICOES_DO_PROJETO).flat()) {
      expect(origens).toContain(destino)
    }
  })
})

describe('podeIrDe', () => {
  it('deixa pausar e concluir o que está em andamento', () => {
    expect(podeIrDe('EM_ANDAMENTO', 'PAUSADO')).toBe(true)
    expect(podeIrDe('EM_ANDAMENTO', 'CONCLUIDO')).toBe(true)
  })

  it('deixa retomar o que está pausado', () => {
    expect(podeIrDe('PAUSADO', 'EM_ANDAMENTO')).toBe(true)
  })

  it('não deixa nada voltar para rascunho', () => {
    expect(podeIrDe('EM_ANDAMENTO', 'RASCUNHO')).toBe(false)
    expect(podeIrDe('PAUSADO', 'RASCUNHO')).toBe(false)
  })

  it('não deixa sair de concluído nem de cancelado', () => {
    expect(ehTerminal('CONCLUIDO')).toBe(true)
    expect(ehTerminal('CANCELADO')).toBe(true)
    expect(podeIrDe('CONCLUIDO', 'EM_ANDAMENTO')).toBe(false)
    expect(podeIrDe('CANCELADO', 'EM_ANDAMENTO')).toBe(false)
  })

  /*
   * Soltar o cartão na coluna de onde ele saiu não é transição nenhuma, e a
   * tela não deve tratar isso como recusa.
   */
  it('não recusa o cartão que voltou para a própria coluna', () => {
    expect(podeIrDe('CONCLUIDO', 'CONCLUIDO')).toBe(true)
    expect(motivoDaRecusa('CONCLUIDO', 'CONCLUIDO')).toBeNull()
  })
})

/**
 * A mensagem é a razão de a tabela estar no front: "Não consegui mover,
 * desfazendo…" não ensina nada a ninguém.
 */
describe('motivoDaRecusa', () => {
  it('é nulo quando dá', () => {
    expect(motivoDaRecusa('EM_ANDAMENTO', 'PAUSADO')).toBeNull()
  })

  it('explica o terminal falando do projeto, não da máquina de estados', () => {
    const motivo = motivoDaRecusa('CONCLUIDO', 'EM_ANDAMENTO')
    expect(motivo).toBeTruthy()
    expect(motivo).not.toMatch(/transi[çc]|CONCLUIDO|EM_ANDAMENTO/)
  })

  it('explica que rascunho é a espera do aceite', () => {
    expect(motivoDaRecusa('EM_ANDAMENTO', 'RASCUNHO')).toMatch(/aceite/i)
  })
})
