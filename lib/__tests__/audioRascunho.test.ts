import { beforeEach, expect, it, vi } from 'vitest'
vi.mock('@/lib/api', () => ({ api: {}, apiUpload: vi.fn() }))
import { apiUpload } from '@/lib/api'
import { prepararComentarioDeAudio, enviarComentarioDeAudio } from '../feedbacksDaArte'
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiUpload).mockResolvedValue({ data: { transcricao: 'Talvez', recibo: 'r' } } as never) })
it.each(['', 'tok'])('prepara rascunho pela porta correta, com arte e versão: %s', async token => {
  await prepararComentarioDeAudio({ token, arteId: 'a', versaoNumero: 2, audio: new Blob(['som'], { type: 'audio/mp4' }), extensao: 'm4a' })
  const [path, form] = vi.mocked(apiUpload).mock.calls[0]
  expect(path).toBe(token ? '/links/tok/feedbacks/audio/rascunho' : '/feedbacks/audio/rascunho')
  expect((form as FormData).get('versaoNumero')).toBe('2')
  expect(((form as FormData).get('audio') as File).name).toBe('gravacao.m4a')
})
it('envia texto conferido, recibo e posição junto com o áudio original', async () => {
  await enviarComentarioDeAudio({ token: 'tok', arteId: 'a', audio: new Blob(['som']), extensao: 'webm', revisado: true, conteudoRevisado: 'Talvez aumentar.', recibo: 'assinado', versaoNumero: 2, posicaoX: .2, posicaoY: .5 })
  const [path, form] = vi.mocked(apiUpload).mock.calls[0]
  expect(path).toBe('/links/tok/feedbacks/audio')
  expect((form as FormData).get('conteudoRevisado')).toBe('Talvez aumentar.')
  expect((form as FormData).get('recibo')).toBe('assinado')
  expect((form as FormData).get('revisado')).toBe('true')
  expect((form as FormData).get('posicaoX')).toBe('0.2')
})
