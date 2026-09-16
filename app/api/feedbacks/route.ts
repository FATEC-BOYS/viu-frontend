import { backendFetch, credenciaisDaRequisicao } from "@/lib/serverBackend";
import { NextResponse } from 'next/server'


/**
 * Comentar — pelo link compartilhado ou pela própria conta.
 *
 * Ler pelo link é público (GET /preview/:token), mas comentar exige conta:
 * Feedback.autorId é obrigatório no schema, com FK para usuarios, então todo
 * comentário tem autor rastreável — é o que sustenta o histórico de aprovação
 * e o caminho de anonimização da LGPD. Convidado sem cadastro não cabe aí.
 *
 * Com token, vai por `POST /links/:token/feedbacks`, que respeita o
 * `somenteLeitura` DO LINK — o link é encaminhável e pode parar na mão de um
 * terceiro. Sem token, vai por `POST /feedbacks`, que exige acesso ao projeto:
 * é o cliente na conta dele, e a permissão dele não vem da configuração de um
 * link específico (podem existir dois links da mesma arte, com switches
 * diferentes; nenhum deles é a regra da pessoa).
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || ''
    const auth = credenciaisDaRequisicao(req);
    if (!auth) {
      return NextResponse.json(
        { error: 'Entre na sua conta para comentar nesta arte.' },
        { status: 401 },
      )
    }

    // JSON (texto/posicional) — proxy direto para o backend
    if (contentType.includes('application/json')) {
      const body = await req.json()
      const { token, conteudo, tipo, posicao_x, posicao_y } = body

      // guestNome/guestEmail eram enviados aqui, mas o backend nunca os leu —
      // o autor sai do token.
      const corpo = JSON.stringify(
        token
          ? {
              conteudo: conteudo ?? '',
              tipo: tipo ?? 'TEXTO',
              posicaoX: posicao_x ?? null,
              posicaoY: posicao_y ?? null,
            }
          : {
              // `POST /feedbacks` precisa saber sobre qual arte é — o link
              // dizia isso pelo token.
              arteId: body.arteId,
              conteudo: conteudo ?? '',
              tipo: tipo ?? 'TEXTO',
              posicaoX: posicao_x ?? null,
              posicaoY: posicao_y ?? null,
            },
      )

      if (!token && !body.arteId) {
        return NextResponse.json({ error: 'Arte não informada.' }, { status: 400 })
      }

      const res = await backendFetch(token ? `/links/${token}/feedbacks` : '/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth },
        body: corpo,
      })
      const data = await res.json()
      return NextResponse.json(data, { status: res.ok ? 201 : res.status })
    }

    // Form-data (áudio) — encaminha multipart ao backend
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const token = String(form.get('token') || '')
      const file = form.get('file') as File | null

      const arteId = form.get('arteId')

      if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
      if (!token && !arteId) {
        return NextResponse.json({ error: 'Arte não informada.' }, { status: 400 })
      }

      // Monta novo FormData para encaminhar ao backend
      const fwd = new FormData()
      fwd.append('audio', file, file.name)
      if (arteId) fwd.append('arteId', String(arteId))
      const posX = form.get('posicao_x'); if (posX) fwd.append('posicaoX', String(posX))
      const posY = form.get('posicao_y'); if (posY) fwd.append('posicaoY', String(posY))

      const res = await backendFetch(
        token ? `/links/${token}/feedbacks/audio` : '/feedbacks/audio',
        {
          method: 'POST',
          headers: { ...auth },
          body: fwd,
        },
      )
      const data = await res.json()
      return NextResponse.json(data, { status: res.ok ? 201 : res.status })
    }

    return NextResponse.json({ error: 'Formato não suportado' }, { status: 415 })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
