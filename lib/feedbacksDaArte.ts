// lib/feedbacksDaArte.ts
import { api, apiUpload } from '@/lib/api'
import { paraFeedbackItem, type FeedbackItem } from '@/components/viewer/types'

/**
 * Comentar e responder, falando DIRETO com o backend.
 *
 * Isto morava em rotas do Next (`app/api/feedbacks/*`), que recebiam a
 * chamada do navegador e a repassavam à API anexando o cookie da sessão. O
 * repasse não podia funcionar publicado: o cookie é gravado pelo backend sem
 * atributo `Domain`, portanto host-only, e o navegador só o entrega ao host
 * que o criou. Local, API e app dividem `localhost` — porta não conta para
 * cookie — e o repasse via tudo. Em domínios diferentes o servidor Next
 * recebia a requisição sem cookie nenhum e respondia
 * "Entre na sua conta para comentar nesta arte" a quem estava logada,
 * inclusive no link compartilhado, que é a promessa central do produto.
 *
 * O navegador não tem esse problema: ele guarda o cookie do host do backend e
 * o entrega quando fala com o backend. Passando por `api`, cada chamada ainda
 * ganha renovação de sessão e reenvio — que o `fetch` cru para `/api/...`
 * nunca teve.
 *
 * As duas portas do comentário continuam sendo duas, pela mesma razão de
 * antes: com token vai por `/links/:token/feedbacks`, que respeita o
 * `somenteLeitura` DO LINK (ele é encaminhável e pode parar na mão de um
 * terceiro); sem token vai por `/feedbacks`, que exige acesso ao projeto — é
 * a pessoa na conta dela, e a permissão dela não vem da configuração de um
 * link específico.
 */

export type NovoComentario = {
  token: string
  arteId: string
  conteudo: string
  posicaoX: number | null
  posicaoY: number | null
}

export async function enviarComentario({
  token,
  arteId,
  conteudo,
  posicaoX,
  posicaoY,
}: NovoComentario): Promise<any> {
  const corpo = token
    ? { conteudo, tipo: 'TEXTO', posicaoX, posicaoY }
    : { arteId, conteudo, tipo: 'TEXTO', posicaoX, posicaoY }

  const res = await api.post<{ data?: any }>(
    token ? `/links/${encodeURIComponent(token)}/feedbacks` : '/feedbacks',
    corpo,
  )
  return (res as any)?.data ?? res
}

export async function enviarComentarioDeAudio({
  token,
  arteId,
  audio,
  extensao = 'webm',
  versaoNumero, revisado, conteudoRevisado, recibo,
  posicaoX,
  posicaoY,
}: {
  token: string
  arteId: string
  audio: Blob
  /**
   * A extensão do que foi REALMENTE gravado — `webm` no Chrome e no Firefox,
   * `m4a` no Safari.
   *
   * Era fixa em `.webm`, e isso não era só cosmético: o backend valida o PAR
   * tipo/extensão (`validateMimeType`), então um blob `audio/mp4` com nome
   * `.webm` é recusado com 400 — o que aconteceria com toda gravação feita no
   * iPhone, assim que o gravador passasse a saber gravar lá.
   */
  extensao?: string
  versaoNumero?: number
  revisado?: boolean
  conteudoRevisado?: string
  recibo?: string
  posicaoX: number | null
  posicaoY: number | null
}): Promise<any> {
  const form = new FormData()
  form.append('audio', audio, `gravacao_${Date.now()}.${extensao}`)
  // Com token a arte sai do próprio token; sem ele é preciso dizer qual é.
  if (!token) form.append('arteId', arteId)
  if (versaoNumero !== undefined) form.append('versaoNumero', String(versaoNumero))
  if (revisado) form.append('revisado', 'true')
  if (conteudoRevisado !== undefined) form.append('conteudoRevisado', conteudoRevisado)
  if (recibo) form.append('recibo', recibo)
  if (posicaoX !== null) form.append('posicaoX', String(posicaoX))
  if (posicaoY !== null) form.append('posicaoY', String(posicaoY))

  const res = await apiUpload<{ data?: any }>(
    token ? `/links/${encodeURIComponent(token)}/feedbacks/audio` : '/feedbacks/audio',
    form,
  )
  return (res as any)?.data ?? res
}

/*
 * Resposta é feedback, e usa o tipo de feedback.
 *
 * Havia um `normalizarResposta` com forma própria (`autor` aninhado, sem
 * `tipo`, sem `status`) para a mesma linha de banco que a trilha já lia como
 * `FeedbackItem`. Duas formas para a mesma coisa divergem — foi assim que
 * `FeedbackItem` ganhou um `status: 'PENDENTE'` que não existia na união, e
 * `Aprovacao` acabou declarada duas vezes. Com uma forma só, a resposta pode
 * entrar na trilha sem tradutor no meio.
 */

/**
 * A thread de um feedback.
 *
 * Resposta é um feedback com `parentId` apontando para o pai (migration
 * 20240106000000_feedback_threads), então ler a thread é ler o pai: o
 * `GET /feedbacks/:id` já traz `respostas`.
 */
export async function listarRespostas(feedbackId: string): Promise<FeedbackItem[]> {
  /*
   * `redirecionarNo401: false` porque esta leitura é OPCIONAL numa página
   * cuja leitura é pública.
   *
   * Ler a thread exige conta — a rota antiga respondia 401 com `[]`, e quem
   * chamava ignorava em silêncio. Trocando aquele `fetch` cru por `api`, o
   * 401 passou a tentar renovar e, falhando, mandar para o login: o visitante
   * anônimo que abrisse o link do WhatsApp e clicasse em "Respostas" era
   * EXPULSO da página que tinha todo o direito de estar lendo. Medido: clique
   * no botão e a URL virava /login?next=…
   *
   * Aqui 401 significa "esta pessoa não vê as respostas", que é uma resposta
   * válida — e não "a sessão acabou, vá fazer login".
   */
  try {
    const res = await api.get<{ data?: any }>(
      `/feedbacks/${encodeURIComponent(feedbackId)}`,
      { redirecionarNo401: false },
    )
    return ((res as any)?.data?.respostas ?? []).map(paraFeedbackItem)
  } catch {
    return []
  }
}

/**
 * Responder — pelas duas portas, como comentar.
 *
 * Com token vai por `/links/:token/feedbacks` com `parentId`: o token
 * autoriza a CONVERSA daquela arte, não só a primeira mensagem, e respeita o
 * `somenteLeitura` do link como comentar já respeitava. Antes só existia a
 * porta de sessão, que exige vínculo com o projeto — então o designer
 * respondia "vou clarear na v2" e quem recebeu o link não tinha como dizer
 * "não era isso". O laço que o produto existe para fechar morria aí.
 *
 * Pelo token a arte sai do próprio token, então não há a consulta ao pai: é
 * uma requisição em vez de duas, e uma a menos para dar errado.
 */
export async function responder(
  feedbackId: string,
  conteudo: string,
  token = '',
): Promise<FeedbackItem> {
  const texto = String(conteudo ?? '').trim()
  if (!texto) throw new Error('Conteúdo vazio.')

  if (token) {
    const res = await api.post<{ data?: any }>(
      `/links/${encodeURIComponent(token)}/feedbacks`,
      { conteudo: texto.slice(0, 2000), tipo: 'TEXTO', parentId: feedbackId },
    )
    return paraFeedbackItem((res as any)?.data ?? res)
  }

  // Sem token, `arteId` sai do próprio pai — a resposta vive na mesma arte, e
  // o backend recusa `parentId` de outra arte.
  const paiRes = await api.get<{ data?: any }>(`/feedbacks/${encodeURIComponent(feedbackId)}`)
  const pai = (paiRes as any)?.data
  const arteId = pai?.arte?.id ?? pai?.arteId
  if (!arteId) throw new Error('Feedback não encontrado.')

  const res = await api.post<{ data?: any }>('/feedbacks', {
    conteudo: texto.slice(0, 2000),
    tipo: 'TEXTO',
    arteId,
    parentId: feedbackId,
  })
  return paraFeedbackItem((res as any)?.data ?? res)
}


/** Prévia sem publicar: o blob fica no navegador até a confirmação. */
export async function prepararComentarioDeAudio({ token, arteId, versaoNumero, audio, extensao }: {
  token: string; arteId: string; versaoNumero: number; audio: Blob; extensao: string
}): Promise<{ transcricao: string; recibo: string }> {
  const form = new FormData()
  form.append('arteId', arteId)
  form.append('versaoNumero', String(versaoNumero))
  form.append('audio', audio, `gravacao.${extensao}`)
  const res = await apiUpload<{ data: { transcricao: string; recibo: string } }>(token ? `/links/${encodeURIComponent(token)}/feedbacks/audio/rascunho` : '/feedbacks/audio/rascunho', form)
  return res.data
}

export type AjusteSugerido = { descricao: string; trechoOriginal: string }
export async function sugerirAjustesDoComentario({ token, ...dados }: {
  token: string; arteId: string; versaoNumero: number; texto: string
}): Promise<AjusteSugerido[]> {
  const res = await api.post<{ data: { ajustes: AjusteSugerido[] } }>(token ? `/links/${encodeURIComponent(token)}/feedbacks/ajustes/rascunho` : '/feedbacks/ajustes/rascunho', dados)
  return res.data.ajustes
}
