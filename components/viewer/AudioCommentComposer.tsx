'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAudioRecorder, formatElapsed } from './hooks/useAudioRecorder'
import { prepararComentarioDeAudio, enviarComentarioDeAudio } from '@/lib/feedbacksDaArte'

type Gravacao = { blob: Blob; extensao: string }

/** O áudio só vira comentário depois de a pessoa conferir e enviar. */
export function useAudioCommentDraft({ token, arteId, versaoNumero, posicaoX, posicaoY, disabled, onCreated }: {
  token: string; arteId: string; versaoNumero: number; posicaoX: number | null; posicaoY: number | null
  disabled: boolean; onCreated: (feedback: any) => void
}) {
  const recorder = useAudioRecorder()
  const [gravacao, setGravacao] = useState<Gravacao | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [recibo, setRecibo] = useState<string | undefined>()
  const [etapa, setEtapa] = useState<'idle' | 'transcrevendo' | 'enviando'>('idle')
  const [erro, setErro] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const vivo = useRef(true)
  const parando = useRef(false)
  const [iniciando, setIniciando] = useState(false)
  useEffect(() => { vivo.current = true; return () => { vivo.current = false } }, [])
  useEffect(() => {
    if (!gravacao) { setUrl(null); return }
    const local = URL.createObjectURL(gravacao.blob)
    setUrl(local)
    return () => URL.revokeObjectURL(local)
  }, [gravacao])

  async function transcrever(g: Gravacao) {
    setEtapa('transcrevendo'); setErro(null); setErroEnvio(null); setRecibo(undefined)
    try {
      const r = await prepararComentarioDeAudio({ token, arteId, versaoNumero, audio: g.blob, extensao: g.extensao })
      if (!vivo.current) return
      setTexto(r.transcricao); setRecibo(r.recibo)
    } catch (e) {
      if (vivo.current) setErro(e instanceof Error ? e.message : 'Não foi possível transcrever. Sua gravação continua aqui.')
    } finally { if (vivo.current) setEtapa('idle') }
  }
  async function parar() {
    if (parando.current) return
    parando.current = true
    let g: Gravacao | null
    try { g = await recorder.stop() } finally { parando.current = false }
    if (!g || !vivo.current) return
    if (!g.blob.size) { setErro('A gravação ficou vazia. Grave novamente.'); return }
    setGravacao(g); setTexto(''); setRecibo(undefined); setErroEnvio(null)
    await transcrever(g)
  }
  // Interrompe gravações longas; a pessoa ainda pode conferir o texto inteiro.
  useEffect(() => { if (recorder.elapsedMs >= 120000 && recorder.state === 'recording') void parar() }, [recorder.elapsedMs, recorder.state]) // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar() {
    if (!gravacao || etapa !== 'idle') return
    setEtapa('enviando'); setErroEnvio(null)
    try {
      const feedback = await enviarComentarioDeAudio({ token, arteId, versaoNumero, audio: gravacao.blob, extensao: gravacao.extensao, posicaoX, posicaoY, revisado: true, conteudoRevisado: texto.trim(), recibo })
      if (!vivo.current) return
      setGravacao(null); setTexto(''); setRecibo(undefined); setErro(null)
      onCreated(feedback)
    } catch (e) {
      if (vivo.current) setErroEnvio(e instanceof Error ? e.message : 'Não foi possível enviar. Sua gravação e seu texto foram mantidos.')
    } finally { if (vivo.current) setEtapa('idle') }
  }

  return { recorder, gravacao, url, texto, setTexto, recibo, etapa, erro, erroEnvio, iniciando, setIniciando, vivo, transcrever, parar, enviar, setGravacao, setRecibo, setErro, setErroEnvio, disabled, ativo: iniciando || !!gravacao || recorder.state !== 'idle' }
}

export default function AudioCommentComposer({ draft }: { draft: ReturnType<typeof useAudioCommentDraft> }) {
  const { recorder, gravacao, url, texto, setTexto, recibo, etapa, erro, erroEnvio, iniciando, setIniciando, vivo, transcrever, parar, enviar, setGravacao, setRecibo, setErro, setErroEnvio, disabled } = draft
  return <div className="space-y-2">
    {!gravacao ? <>
      {recorder.state === 'idle' ? <Button variant="secondary" size="sm" disabled={disabled || iniciando} onClick={async () => { setIniciando(true); try { await recorder.start() } finally { if (vivo.current) setIniciando(false) } }}><Mic className="mr-1 h-4 w-4" />Gravar áudio</Button> : <Button variant="destructive" size="sm" onClick={() => void parar()}><Square className="mr-1 h-4 w-4" />Parar ({formatElapsed(recorder.elapsedMs)})</Button>}
      {recorder.state !== 'idle' && <p className="text-xs text-muted-foreground">Fale seu comentário. Você poderá conferir antes de enviar. Limite de 2 minutos.</p>}
      {recorder.permissionError && <p role="alert" className="text-xs text-destructive">{recorder.permissionError}</p>}
      {erro && <p role="alert" className="text-xs text-destructive">{erro}</p>}
    </> : <section aria-label="Conferir comentário de voz" className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-medium">Confira antes de enviar</p>
      <p className="text-xs text-muted-foreground">O áudio original acompanha o comentário. Nada foi publicado ainda.</p>
      {url && <audio aria-label="Ouvir gravação" src={url} controls className="w-full" />}
      {etapa === 'transcrevendo' && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Transformando sua fala em texto…</p>}
      {erro && <div role="alert" className="space-y-2 text-sm"><p>{erro}</p><Button variant="outline" size="sm" disabled={etapa !== 'idle'} onClick={() => void transcrever(gravacao)}>Tentar transcrever novamente</Button><p className="text-xs text-muted-foreground">Você também pode escrever abaixo ou enviar apenas o áudio.</p></div>}
      <label className="block space-y-1 text-sm">Texto do comentário<Textarea aria-label="Texto do comentário de voz" value={texto} onChange={e => setTexto(e.target.value)} maxLength={10000} disabled={etapa !== 'idle'} placeholder="Confira a transcrição ou escreva seu comentário…" /></label>
      {recibo && !texto.trim() && <p className="text-xs text-muted-foreground">Confira o texto do comentário antes de enviar.</p>}
      {erroEnvio && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{erroEnvio}</p><Button variant="outline" size="sm" disabled={etapa !== 'idle'} onClick={() => void transcrever(gravacao)}>Transcrever novamente</Button></div>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={etapa !== 'idle'} onClick={() => { setGravacao(null); setTexto(''); setRecibo(undefined); setErro(null); setErroEnvio(null) }}>Descartar gravação</Button>
        <Button size="sm" disabled={disabled || etapa !== 'idle' || (!!recibo && !texto.trim())} onClick={() => void enviar()}>{etapa === 'enviando' ? 'Enviando…' : (texto.trim() || recibo) ? 'Enviar comentário' : 'Enviar só o áudio'}</Button>
      </div>
    </section>}
  </div>
}
