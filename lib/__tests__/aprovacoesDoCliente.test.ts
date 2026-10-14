import { describe, expect, it } from 'vitest'
import { esperandoVoce, jaDecididas, type DecisaoDoCliente } from '@/lib/aprovacoesDoCliente'

/**
 * As duas seções da tela do cliente saem de UMA leitura.
 *
 * Duas chamadas separadas divergiriam no meio de uma decisão sendo tomada —
 * a arte sairia de "esperando você" numa e ainda não teria entrado em "você
 * já respondeu" na outra, e por um instante ela não estaria em lugar nenhum.
 */

function decisao(over: Partial<DecisaoDoCliente> = {}): DecisaoDoCliente {
  return {
    id: 'cap1',
    status: 'PENDENTE',
    comentario: null,
    criadoEm: '2026-10-10T12:00:00.000Z',
    decididoEm: null,
    versaoNumero: 1,
    arte: { id: 'carte1', nome: 'Logo', versao: 1, previewUrl: null },
    ...over,
  }
}

describe('esperandoVoce', () => {
  it('é só o que ainda não foi respondido', () => {
    const lista = [
      decisao({ id: 'a' }),
      decisao({ id: 'b', status: 'APROVADO', decididoEm: '2026-10-11T12:00:00.000Z' }),
      decisao({ id: 'c', status: 'REJEITADO', decididoEm: '2026-10-12T12:00:00.000Z' }),
    ]
    expect(esperandoVoce(lista).map((d) => d.id)).toEqual(['a'])
  })

  it('lista vazia quando a pessoa já respondeu tudo', () => {
    expect(esperandoVoce([decisao({ status: 'APROVADO' })])).toEqual([])
  })
})

describe('jaDecididas', () => {
  it('traz aprovadas e rejeitadas, a mais recente primeiro', () => {
    const lista = [
      decisao({ id: 'antiga', status: 'APROVADO', decididoEm: '2026-10-01T12:00:00.000Z' }),
      decisao({ id: 'pendente' }),
      decisao({ id: 'recente', status: 'REJEITADO', decididoEm: '2026-10-09T12:00:00.000Z' }),
    ]
    expect(jaDecididas(lista).map((d) => d.id)).toEqual(['recente', 'antiga'])
  })

  /*
   * `decididoEm` é nulo em registro antigo — a coluna é posterior a ele. Cair
   * para `criadoEm` mantém a linha na lista em vez de jogá-la para o fim por
   * comparação com string vazia, que é o que "sem data" produziria.
   */
  it('ordena pelo que existe quando a data da decisão é antiga demais', () => {
    const lista = [
      decisao({ id: 'sem-data', status: 'APROVADO', decididoEm: null, criadoEm: '2026-10-08T12:00:00.000Z' }),
      decisao({ id: 'com-data', status: 'APROVADO', decididoEm: '2026-10-02T12:00:00.000Z' }),
    ]
    expect(jaDecididas(lista).map((d) => d.id)).toEqual(['sem-data', 'com-data'])
  })

  it('nunca inclui o que ainda espera decisão', () => {
    expect(jaDecididas([decisao()])).toEqual([])
  })
})
