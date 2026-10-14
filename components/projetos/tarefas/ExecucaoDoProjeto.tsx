'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, getAll } from '@/lib/api'
import { formatarDia } from '@/lib/diaDeCalendario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Estado = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'
type Tarefa = {
  id: string; titulo: string; descricao?: string | null; status: Estado
  prazo?: string | null; responsavel?: { nome: string } | null
}
const ROTULO: Record<Estado, string> = {
  PENDENTE: 'A fazer', EM_ANDAMENTO: 'Em execução', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada',
}
const PROXIMO: Partial<Record<Estado, { status: Estado; label: string }>> = {
  PENDENTE: { status: 'EM_ANDAMENTO', label: 'Iniciar' },
  EM_ANDAMENTO: { status: 'CONCLUIDA', label: 'Concluir tarefa' },
  CONCLUIDA: { status: 'EM_ANDAMENTO', label: 'Retomar tarefa' },
}

export default function ExecucaoDoProjeto({ projetoId, podeEditar }: { projetoId: string; podeEditar: boolean }) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [titulo, setTitulo] = useState('')
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const carregar = useCallback(async () => {
    setErro(false)
    setCarregando(true)
    try { setTarefas(await getAll<Tarefa>(`/tarefas?projetoId=${encodeURIComponent(projetoId)}`)) }
    catch { setErro(true) }
    finally { setCarregando(false) }
  }, [projetoId])
  useEffect(() => { void carregar() }, [carregar])

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!podeEditar || !titulo.trim() || ocupado) return
    setOcupado('nova')
    try {
      await api.post('/tarefas', { titulo: titulo.trim(), projetoId })
      setTitulo('')
      await carregar()
    } catch { toast.error('Não foi possível criar a tarefa. Tente novamente.') }
    finally { setOcupado(null) }
  }
  async function avancar(tarefa: Tarefa) {
    const proximo = PROXIMO[tarefa.status]
    if (!podeEditar || !proximo || ocupado) return
    setOcupado(tarefa.id)
    try {
      await api.put(`/tarefas/${tarefa.id}`, { status: proximo.status })
      setTarefas(atuais => atuais.map(t => t.id === tarefa.id ? { ...t, status: proximo.status } : t))
    } catch { toast.error('Não foi possível atualizar a tarefa. O estado anterior foi mantido.') }
    finally { setOcupado(null) }
  }
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Execução dos ajustes</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Organize o que a equipe precisa fazer antes da próxima entrega.
          Os pedidos do cliente continuam nos comentários da arte.
          Concluir uma tarefa não resolve o comentário nem aprova a arte automaticamente.
        </p>
      </header>
      {podeEditar && <form onSubmit={criar} className="flex flex-col gap-2 sm:flex-row">
        <Input aria-label="O que precisa ser feito" placeholder="Ex.: ajustar o contraste do título" value={titulo} onChange={e => setTitulo(e.target.value)} disabled={!!ocupado} />
        <Button type="submit" disabled={!!ocupado || !titulo.trim()}>{ocupado === 'nova' ? 'Adicionando…' : 'Adicionar tarefa'}</Button>
      </form>}
      {carregando ? <p role="status" className="text-sm">Carregando tarefas…</p> : erro ? (
        <div role="alert" className="rounded-xl border p-4">
          <p>Não foi possível carregar as tarefas deste projeto.</p>
          <Button onClick={() => void carregar()} variant="outline" className="mt-2">Tentar novamente</Button>
        </div>
      ) : tarefas.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Nenhuma tarefa neste projeto. Use este espaço quando precisar dividir um ajuste em etapas ou organizar a próxima entrega.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {[...tarefas].sort((a, b) => ['PENDENTE','EM_ANDAMENTO','CONCLUIDA','CANCELADA'].indexOf(a.status) - ['PENDENTE','EM_ANDAMENTO','CONCLUIDA','CANCELADA'].indexOf(b.status)).map(t => (
            <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1 basis-48">
                <h3 className="break-words font-medium">{t.titulo}</h3>
                {t.descricao && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{t.descricao}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{ROTULO[t.status]} · {t.responsavel?.nome ?? 'Sem responsável'}{t.prazo && ` · ${formatarDia(t.prazo)}`}</p>
              </div>
              {podeEditar && PROXIMO[t.status] && <Button variant="outline" size="sm" disabled={!!ocupado} onClick={() => void avancar(t)}>
                {ocupado === t.id ? 'Salvando…' : PROXIMO[t.status]?.label}
              </Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
