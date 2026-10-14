// lib/aprovacoesDoCliente.ts
import { getAll } from '@/lib/api'

/**
 * As decisões de UMA pessoa num projeto — a leitura que a tela do cliente faz.
 *
 * A tela do projeto era a tela do designer para todo mundo, e por isso a
 * pergunta do cliente nunca teve resposta. Medido, logado como cliente, num
 * projeto com uma arte esperando a decisão dele:
 *
 *   "Próximos passos: Enviar para aprovação"   ← passo do designer
 *   "Tarefas: Ajustar cor do logo · Ana Silva" ← o quadro interno do ateliê
 *   "esperando João Santos desde 14/10"        ← ele, em terceira pessoa
 *   [Enviar lembrete]                          ← para lembrar a si mesmo
 *
 * E em nenhum lugar "tem uma arte esperando você", nem como decidir.
 *
 * `GET /aprovacoes` já aceita os três filtros de que esta tela precisa e já
 * assina a miniatura da arte — então a fila do cliente sai de UMA chamada, e
 * não de uma por arte.
 */

export type DecisaoDoCliente = {
  id: string
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO'
  comentario: string | null
  criadoEm: string
  decididoEm: string | null
  /** Sobre qual entrega a decisão é — `null` em registro anterior ao campo. */
  versaoNumero: number | null
  arte: {
    id: string
    nome: string
    versao: number
    /** URL assinada; a chave crua do bucket não carrega em `<img>`. */
    previewUrl: string | null
  }
}

function paraDecisao(a: any): DecisaoDoCliente {
  return {
    id: a.id,
    status: a.status,
    comentario: a.comentario ?? null,
    criadoEm: a.criadoEm ?? '',
    decididoEm: a.decididoEm ?? null,
    versaoNumero: a.versaoNumero ?? null,
    arte: {
      id: a.arte?.id ?? '',
      nome: a.arte?.nome ?? 'Arte',
      versao: a.arte?.versao ?? 1,
      // `previewUrl` é o nome que o backend assina; `arquivo` é a chave crua e
      // nunca pode virar `src` — é o mesmo erro que já quebrou a imagem da
      // arte no link público e o áudio dos comentários.
      previewUrl: a.arte?.previewUrl ?? null,
    },
  }
}

/**
 * Tudo que passou pelas mãos desta pessoa neste projeto, decidido ou não.
 *
 * Uma leitura só, separada depois em "esperando você" e "já decididas": são
 * duas seções da mesma tela, e duas chamadas divergiriam entre si no meio de
 * uma decisão sendo tomada.
 */
export async function listarDecisoesDoProjeto(
  projetoId: string,
  aprovadorId: string,
): Promise<DecisaoDoCliente[]> {
  /*
   * `getAll`, e não `limit=100`.
   *
   * A listagem vem ordenada por `criadoEm desc`, então um teto fixo corta as
   * MAIS ANTIGAS em silêncio. Isso tira linhas de "você já respondeu" — ruim —
   * e, pior, pode esconder uma decisão PENDENTE antiga enquanto a tela afirma
   * "nada esperando por você". A frase viraria mentira justamente para quem
   * está sendo esperado.
   *
   * O ajudante já existe e o comentário dele avisa disto: "usar no lugar de
   * `limit=200` & cia... um limite fixo trunca silenciosamente quem tem mais
   * itens que o chute". Eu chutei 100.
   */
  const linhas = await getAll<any>(
    `/aprovacoes?projetoId=${encodeURIComponent(projetoId)}` +
      `&aprovadorId=${encodeURIComponent(aprovadorId)}`,
  )
  return linhas.map(paraDecisao)
}

/** O que espera por esta pessoa — a razão de a tela existir. */
export function esperandoVoce(decisoes: DecisaoDoCliente[]): DecisaoDoCliente[] {
  return decisoes.filter((d) => d.status === 'PENDENTE')
}

/** O que ela já respondeu, da mais recente para a mais antiga. */
export function jaDecididas(decisoes: DecisaoDoCliente[]): DecisaoDoCliente[] {
  return decisoes
    .filter((d) => d.status !== 'PENDENTE')
    .sort((a, b) => (b.decididoEm ?? b.criadoEm).localeCompare(a.decididoEm ?? a.criadoEm))
}
