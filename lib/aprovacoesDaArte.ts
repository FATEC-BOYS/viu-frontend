// lib/aprovacoesDaArte.ts
import { api, getAll } from '@/lib/api'

/**
 * As aprovações de uma arte, faladas DIRETO com o backend.
 *
 * Isto passava por `app/api/arte/[id]/aprovacoes`, uma rota do Next que
 * recebia a chamada do navegador e a repassava anexando o cookie. Publicado,
 * o servidor Next não tem esse cookie — ele é host-only no domínio do backend
 * —, então o repasse respondia `{ aprovacoes: [] }` e ninguém via decisão
 * nenhuma: nem o histórico, nem o "é a sua vez".
 *
 * A guarda `acessoAArte` que a rota fazia antes de listar não se perde: o
 * backend escopa a própria listagem por `getAccessibleProjectIds`, então
 * quem não é do projeto recebe lista vazia de qualquer caminho. Ela era
 * cinto além do suspensório, não o suspensório.
 */

export type StatusDaAprovacao = 'PENDENTE' | 'APROVADO' | 'REJEITADO'

export type AprovacaoDaArte = {
  id: string
  status: StatusDaAprovacao
  comentario: string | null
  criadoEm: string
  versaoNumero: number | null
  aprovador: { id: string; nome: string | null } | null
}

export async function listarAprovacoes(arteId: string): Promise<AprovacaoDaArte[]> {
  const lista = await getAll<AprovacaoDaArte>(`/aprovacoes?arteId=${encodeURIComponent(arteId)}`)
  return lista.map((a) => ({
    id: a.id,
    status: a.status as StatusDaAprovacao,
    comentario: a.comentario ?? null,
    criadoEm: a.criadoEm ?? '',
    // O backend registra qual entrega foi julgada. Sem isso a tela não
    // consegue dizer "você aprovou a v2, a v3 continua pendente".
    versaoNumero: a.versaoNumero ?? null,
    aprovador: a.aprovador ? { id: a.aprovador.id, nome: a.aprovador.nome ?? null } : null,
  }))
}

/**
 * A decisão vai pelo ID DA LINHA que a tela escolheu e mostrou.
 *
 * A rota antiga também aceitava só o `aprovadorId` e reconsultava
 * `?status=PENDENTE&limit=1` para redescobrir qual linha era — e o painel de
 * aprovações usava justamente esse caminho, tendo o id na mão. São duas
 * consultas, com limites diferentes, concordando por um `orderBy` que
 * nenhuma declara; e a mesma pessoa pode ter duas pendências abertas na
 * mesma arte, porque `solicitarAprovacao` deduplica por `versaoNumero`. O
 * modo de falhar é registrar a decisão na versão errada, que neste produto é
 * o ato que vale. Sem a reconsulta não há de onde divergir.
 *
 * Não é buraco de autorização mandar o id: o backend recusa com 403 quando
 * `aprovacao.aprovadorId !== usuario.id`, por qualquer caminho.
 */
export async function decidirAprovacao(
  aprovacaoId: string,
  decisao: 'APROVADO' | 'REJEITADO',
  comentario?: string | null,
): Promise<void> {
  await api.put(`/aprovacoes/${encodeURIComponent(aprovacaoId)}`, {
    status: decisao,
    comentario: comentario ?? null,
  })
}
