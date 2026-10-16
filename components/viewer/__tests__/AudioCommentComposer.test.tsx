import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import AudioCommentComposer, { useAudioCommentDraft } from '../AudioCommentComposer'
function TestComposer(props: Parameters<typeof useAudioCommentDraft>[0]) { const draft = useAudioCommentDraft(props); const [visible, setVisible] = useState(true); return <><button onClick={() => setVisible(v => !v)}>Alternar painel</button>{visible && <AudioCommentComposer draft={draft} />}</> }
const mocks = vi.hoisted(() => ({ preparar: vi.fn(), enviar: vi.fn(), stop: vi.fn(), start: vi.fn(), sugerir: vi.fn() }))
vi.mock('@/lib/feedbacksDaArte', () => ({ prepararComentarioDeAudio: mocks.preparar, enviarComentarioDeAudio: mocks.enviar, sugerirAjustesDoComentario: mocks.sugerir }))
vi.mock('../hooks/useAudioRecorder', () => ({ useAudioRecorder: () => ({ state: 'recording', elapsedMs: 1000, start: mocks.start, stop: mocks.stop }), formatElapsed: () => '00:01' }))
const created = vi.fn()
const props = { token: 'tok', arteId: 'arte', versaoNumero: 2, posicaoX: .3, posicaoY: .4, disabled: false, onCreated: created, onActiveChange: vi.fn() }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.stop.mockResolvedValue({ blob: new Blob(['audio'], { type: 'audio/mp4' }), extensao: 'm4a' })
  mocks.preparar.mockResolvedValue({ transcricao: 'Talvez aumentar o título.', recibo: 'assinado' })
  mocks.enviar.mockResolvedValue({ id: 'comentario' })
  URL.createObjectURL = vi.fn(() => 'blob:rascunho')
  URL.revokeObjectURL = vi.fn()
})
async function gravar() {
  render(<TestComposer {...props} />)
  await userEvent.click(screen.getByRole('button', { name: /Parar/ }))
  await screen.findByRole('region', { name: 'Conferir comentário de voz' })
}
it('não publica ao parar: permite editar e só envia na confirmação', async () => {
  await gravar()
  const campo = await screen.findByLabelText('Texto do comentário de voz')
  await waitFor(() => expect(campo).toHaveValue('Talvez aumentar o título.'))
  expect(mocks.enviar).not.toHaveBeenCalled()
  await userEvent.clear(campo)
  await userEvent.type(campo, 'Talvez aumentar o título, mantendo a fonte.')
  await userEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }))
  expect(mocks.enviar).toHaveBeenCalledWith(expect.objectContaining({ conteudoRevisado: 'Talvez aumentar o título, mantendo a fonte.', revisado: true, recibo: 'assinado', versaoNumero: 2, posicaoX: .3, posicaoY: .4, extensao: 'm4a' }))
  expect(mocks.preparar).toHaveBeenCalledTimes(1)
  expect(created).toHaveBeenCalledWith({ id: 'comentario' })
})
it('mantém áudio se a transcrição falhar e permite confirmar só o áudio', async () => {
  mocks.preparar.mockRejectedValueOnce(new Error('Serviço temporariamente indisponível'))
  await gravar()
  expect(await screen.findByRole('alert')).toHaveTextContent('Serviço temporariamente indisponível')
  expect(mocks.enviar).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Enviar só o áudio' }))
  expect(mocks.enviar).toHaveBeenCalledWith(expect.objectContaining({ conteudoRevisado: '', recibo: undefined, revisado: true }))
})
it('permite tentar transcrever de novo sem criar comentário', async () => {
  mocks.preparar.mockRejectedValueOnce(new Error('Falhou'))
  await gravar()
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar transcrever novamente' }))
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toHaveValue('Talvez aumentar o título.'))
  expect(mocks.enviar).not.toHaveBeenCalled()
})
it('descarta o rascunho sem publicar e libera a URL local', async () => {
  await gravar()
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Descartar gravação' }))
  expect(mocks.enviar).not.toHaveBeenCalled()
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:rascunho')
})
it('preserva o texto e áudio quando o envio falha', async () => {
  mocks.enviar.mockRejectedValueOnce(new Error('Falha de rede'))
  await gravar()
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Enviar comentário' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha de rede')
  expect(screen.getByLabelText('Texto do comentário de voz')).toHaveValue('Talvez aumentar o título.')
  expect(screen.getByLabelText('Ouvir gravação')).toBeInTheDocument()
  expect(created).not.toHaveBeenCalled()
})

it('mantém o rascunho ao fechar e reabrir o painel de comentários', async () => {
  await gravar()
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Alternar painel' }))
  expect(screen.queryByRole('region')).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Alternar painel' }))
  expect(screen.getByLabelText('Texto do comentário de voz')).toHaveValue('Talvez aumentar o título.')
  expect(mocks.preparar).toHaveBeenCalledTimes(1)
  expect(mocks.enviar).not.toHaveBeenCalled()
})

it('sugere itens sem publicar, permite revisar e inclui a lista só por escolha', async () => {
  mocks.sugerir.mockResolvedValue([{ descricao: 'Talvez aumentar o título.', trechoOriginal: 'Talvez aumentar o título.' }])
  await gravar()
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Sugerir lista de ajustes' }))
  const item = await screen.findByLabelText('Ajuste 1')
  expect(mocks.enviar).not.toHaveBeenCalled()
  await userEvent.clear(item)
  await userEvent.type(item, 'Testar título maior, mantendo a fonte.')
  await userEvent.click(screen.getByRole('button', { name: 'Incluir lista no comentário' }))
  expect(screen.getByLabelText('Texto do comentário de voz')).toHaveValue('Talvez aumentar o título.\n\nAjustes revisados:\n☐ Testar título maior, mantendo a fonte.')
  expect(mocks.enviar).not.toHaveBeenCalled()
})
it('descarta sugestões quando o texto de origem muda', async () => {
  mocks.sugerir.mockResolvedValue([{ descricao: 'Aumentar título', trechoOriginal: 'Talvez aumentar o título.' }])
  await gravar()
  await waitFor(() => expect(screen.getByLabelText('Texto do comentário de voz')).toBeEnabled())
  await userEvent.click(screen.getByRole('button', { name: 'Sugerir lista de ajustes' }))
  await screen.findByLabelText('Ajuste 1')
  await userEvent.type(screen.getByLabelText('Texto do comentário de voz'), ' Não, manter o título.')
  expect(screen.queryByLabelText('Ajuste 1')).not.toBeInTheDocument()
})
