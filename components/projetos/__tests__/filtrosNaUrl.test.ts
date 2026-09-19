import { describe, it, expect } from 'vitest'
import {
  queryDosFiltros,
  filtrosDaQuery,
  type FiltrosDeProjeto,
} from '../types'

/**
 * Os filtros de /projetos viram endereço, e o endereço volta a ser filtro.
 *
 * O comentário do estado inicial da tela diz que a URL existe "para que voltar
 * do detalhe de um projeto não jogue a pessoa de volta na lista crua". A
 * intenção estava certa e a execução guardava metade: busca, status e
 * visualização iam para a URL; prazo, cliente e ordenação ficavam só na
 * memória do componente.
 *
 * E o efeito monta a query do ZERO a cada mudança — então um endereço com
 * `?cliente=…` não era só esquecido, era apagado. Um link mandado para alguém
 * abria sem o filtro.
 *
 * O que estes testes protegem é o ida-e-volta: o que a tela escreve, a tela
 * relê.
 */

const PADRAO: FiltrosDeProjeto = {
  busca: '',
  status: 'todos',
  prazo: 'todos',
  cliente: 'todos',
  ordem: 'criado_em',
  ascendente: false,
  modo: 'cards',
}

function idaEVolta(f: FiltrosDeProjeto) {
  return filtrosDaQuery(new URLSearchParams(queryDosFiltros(f)))
}

describe('filtros de projeto na URL', () => {
  it('sem filtro, o endereço fica limpo', () => {
    // `?status=todos&ordem=criado_em` diria o mesmo que a ausência.
    expect(queryDosFiltros(PADRAO)).toBe('')
  })

  it('cada filtro sobrevive à ida e à volta', () => {
    const cheio: FiltrosDeProjeto = {
      busca: 'ecolife',
      status: 'CONCLUIDO',
      prazo: '30',
      cliente: 'c7783f60e442ac046cd6d7202',
      ordem: 'prazo',
      ascendente: true,
      modo: 'board',
    }
    expect(idaEVolta(cheio)).toEqual(cheio)
  })

  it('leva os três que a tela esquecia', () => {
    const q = queryDosFiltros({ ...PADRAO, prazo: '7', cliente: 'cli1', ordem: 'nome' })
    expect(q).toContain('prazo=7')
    expect(q).toContain('cliente=cli1')
    expect(q).toContain('ordem=nome')
  })

  it('não apaga o filtro de um link recebido', () => {
    // Era isto que acontecia: a tela montava a query do zero, sem conhecer
    // `cliente`, e o `router.replace` reescrevia o endereço sem ele.
    const recebido = new URLSearchParams('cliente=cli1&prazo=30')
    const lido = filtrosDaQuery(recebido)
    expect(queryDosFiltros(lido)).toContain('cliente=cli1')
    expect(queryDosFiltros(lido)).toContain('prazo=30')
  })

  it('espaço em volta da busca não vira filtro', () => {
    expect(queryDosFiltros({ ...PADRAO, busca: '   ' })).toBe('')
    expect(queryDosFiltros({ ...PADRAO, busca: '  logo  ' })).toBe('q=logo')
  })

  it('valor desconhecido na URL cai no padrão, sem quebrar a tela', () => {
    // O endereço é digitável, e um status inventado não pode virar filtro.
    const lido = filtrosDaQuery(new URLSearchParams('status=EXPLODIU&ordem=xyz&prazo=999&view=zzz'))
    expect(lido.status).toBe('todos')
    expect(lido.ordem).toBe('criado_em')
    expect(lido.prazo).toBe('todos')
    expect(lido.modo).toBe('cards')
  })

  it('o cliente passa cru, porque é um id que o produto não enumera', () => {
    // Diferente de status e ordem, não há lista fechada para validar contra —
    // quem decide se o id existe é a lista de clientes da conta.
    expect(filtrosDaQuery(new URLSearchParams('cliente=qualquer')).cliente).toBe('qualquer')
  })
})
