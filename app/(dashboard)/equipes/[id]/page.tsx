'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users2, ArrowLeft, Plus, Trash2, Loader2, FolderOpen,
  Crown, Pencil, X, UserPlus, Link2Off,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { equipesApi, formatPapel, type Equipe, type EquipeMembro, type PapelEquipe } from '@/lib/equipes'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

const PAPEIS: PapelEquipe[] = ['LIDER', 'DESIGNER', 'REVISOR', 'CLIENTE']

const PAPEL_COLOR: Record<PapelEquipe, string> = {
  LIDER: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  DESIGNER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  REVISOR: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  CLIENTE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
}

function PapelBadge({ papel }: { papel: PapelEquipe }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${PAPEL_COLOR[papel]}`}>
      {papel === 'LIDER' && <Crown className="h-3 w-3" />}
      {formatPapel(papel)}
    </span>
  )
}

// ---------- modal adicionar membro ----------

interface Usuario { id: string; nome: string; email: string }

function AdicionarMembroModal({
  equipeId,
  open,
  onOpenChange,
  onSuccess,
}: {
  equipeId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (m: EquipeMembro) => void
}) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<Usuario[]>([])
  const [selecionado, setSelecionado] = useState<Usuario | null>(null)
  const [papel, setPapel] = useState<PapelEquipe>('DESIGNER')
  const [buscando, setBuscando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!busca.trim() || busca.length < 3) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await api.get<{ data: Usuario[] }>(`/usuarios?search=${encodeURIComponent(busca)}&limit=5`)
        setResultados(res.data ?? [])
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [busca])

  const handleClose = (v: boolean) => {
    if (!v) { setBusca(''); setResultados([]); setSelecionado(null); setPapel('DESIGNER') }
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    if (!selecionado) return
    setEnviando(true)
    try {
      const membro = await equipesApi.adicionarMembro(equipeId, selecionado.id, papel)
      toast.success(`${selecionado.nome} adicionado como ${formatPapel(papel)}`)
      onSuccess(membro)
      handleClose(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao adicionar membro')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Adicionar membro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Buscar usuário</Label>
            {selecionado ? (
              <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{selecionado.nome}</p>
                  <p className="text-xs text-muted-foreground">{selecionado.email}</p>
                </div>
                <button onClick={() => setSelecionado(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Digite nome ou e-mail (mín. 3 caracteres)"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  autoFocus
                />
                {(buscando || resultados.length > 0) && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover shadow-md">
                    {buscando ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando…
                      </div>
                    ) : (
                      resultados.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelecionado(u); setResultados([]) }}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                        >
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </button>
                      ))
                    )}
                    {!buscando && resultados.length === 0 && busca.length >= 3 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum usuário encontrado</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as PapelEquipe)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p} value={p}>{formatPapel(p)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selecionado || enviando}>
            {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- modal vincular projeto ----------

interface Projeto { id: string; nome: string; status: string }

function VincularProjetoModal({
  equipeId,
  projetosVinculados,
  open,
  onOpenChange,
  onSuccess,
}: {
  equipeId: string
  projetosVinculados: string[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (p: Projeto) => void
}) {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState(false)
  const [selecionado, setSelecionado] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    api.get<{ data: Projeto[] }>('/projetos?limit=100')
      .then((r) => setProjetos((r.data ?? []).filter((p) => !projetosVinculados.includes(p.id))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, projetosVinculados])

  const handleClose = (v: boolean) => {
    if (!v) setSelecionado('')
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    if (!selecionado) return
    setEnviando(true)
    try {
      await equipesApi.vincularProjeto(equipeId, selecionado)
      const projeto = projetos.find((p) => p.id === selecionado)!
      toast.success(`Projeto "${projeto.nome}" vinculado`)
      onSuccess(projeto)
      handleClose(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao vincular projeto')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Vincular projeto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Projeto</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : (
              <Select value={selecionado} onValueChange={setSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                  {projetos.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Todos os seus projetos já estão vinculados.
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selecionado || enviando}>
            {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Vincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------- page ----------

export default function EquipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalMembro, setModalMembro] = useState(false)
  const [modalProjeto, setModalProjeto] = useState(false)
  const [editandoPapel, setEditandoPapel] = useState<string | null>(null)

  useEffect(() => {
    equipesApi.get(id)
      .then(setEquipe)
      .catch(() => { toast.error('Erro ao carregar equipe'); router.push('/equipes') })
      .finally(() => setLoading(false))
  }, [id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!equipe) return null

  const membros = equipe.membros ?? []
  const projetos = equipe.projetos ?? []
  const isLider = membros.find((m) => m.usuarioId === user?.id)?.papel === 'LIDER'
  const isDono = equipe.donoPrincipalId === user?.id

  const handleRemoverMembro = async (membro: EquipeMembro) => {
    if (!confirm(`Remover ${membro.usuario.nome} da equipe?`)) return
    try {
      await equipesApi.removerMembro(equipe.id, membro.usuarioId)
      toast.success('Membro removido')
      setEquipe((prev) => prev && {
        ...prev,
        membros: prev.membros?.filter((m) => m.usuarioId !== membro.usuarioId),
      })
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao remover membro')
    }
  }

  const handleAlterarPapel = async (usuarioId: string, papel: PapelEquipe) => {
    try {
      await equipesApi.atualizarPapel(equipe.id, usuarioId, papel)
      toast.success('Papel atualizado')
      setEquipe((prev) => prev && {
        ...prev,
        membros: prev.membros?.map((m) =>
          m.usuarioId === usuarioId ? { ...m, papel } : m
        ),
      })
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar papel')
    } finally {
      setEditandoPapel(null)
    }
  }

  const handleDesvincularProjeto = async (projetoId: string, nome: string) => {
    if (!confirm(`Desvincular "${nome}"?`)) return
    try {
      await equipesApi.desvincularProjeto(equipe.id, projetoId)
      toast.success('Projeto desvinculado')
      setEquipe((prev) => prev && {
        ...prev,
        projetos: prev.projetos?.filter((p) => p.id !== projetoId),
      })
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao desvincular projeto')
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <button
          onClick={() => router.push('/equipes')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Equipes
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{equipe.nome}</h1>
              <p className="text-sm text-muted-foreground">/{equipe.slug}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Membros */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            Membros ({membros.length})
          </h2>
          {isLider && (
            <Button size="sm" variant="outline" onClick={() => setModalMembro(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar
            </Button>
          )}
        </div>

        <div className="rounded-xl border divide-y overflow-hidden">
          <AnimatePresence>
            {membros.map((m, i) => (
              <motion.div
                key={m.usuarioId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {m.usuario.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.usuario.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.usuario.email}</p>
                </div>

                {editandoPapel === m.usuarioId && isDono && m.usuarioId !== equipe.donoPrincipalId ? (
                  <Select
                    value={m.papel}
                    onValueChange={(v) => handleAlterarPapel(m.usuarioId, v as PapelEquipe)}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPEIS.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">{formatPapel(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <PapelBadge papel={m.papel} />
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isDono && m.usuarioId !== equipe.donoPrincipalId && (
                    <button
                      onClick={() => setEditandoPapel(editandoPapel === m.usuarioId ? null : m.usuarioId)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Editar papel"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {(isLider && m.usuarioId !== equipe.donoPrincipalId) && (
                    <button
                      onClick={() => handleRemoverMembro(m)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      aria-label="Remover membro"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Projetos */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 24 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            Projetos ({projetos.length})
          </h2>
          {isLider && (
            <Button size="sm" variant="outline" onClick={() => setModalProjeto(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Vincular
            </Button>
          )}
        </div>

        {projetos.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-10 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum projeto vinculado</p>
            {isLider && (
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setModalProjeto(true)}>
                Vincular projeto
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border divide-y overflow-hidden">
            <AnimatePresence>
              {projetos.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="group flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/30 transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium flex-1 truncate">{p.nome}</p>
                  <Badge variant="outline" className="text-xs shrink-0">{p.status.replace(/_/g, ' ')}</Badge>
                  {isLider && (
                    <button
                      onClick={() => handleDesvincularProjeto(p.id, p.nome)}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      aria-label="Desvincular projeto"
                    >
                      <Link2Off className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      <AdicionarMembroModal
        equipeId={equipe.id}
        open={modalMembro}
        onOpenChange={setModalMembro}
        onSuccess={(m) =>
          setEquipe((prev) => prev && { ...prev, membros: [...(prev.membros ?? []), m] })
        }
      />

      <VincularProjetoModal
        equipeId={equipe.id}
        projetosVinculados={projetos.map((p) => p.id)}
        open={modalProjeto}
        onOpenChange={setModalProjeto}
        onSuccess={(p) =>
          setEquipe((prev) => prev && { ...prev, projetos: [...(prev.projetos ?? []), p] })
        }
      />
    </div>
  )
}
