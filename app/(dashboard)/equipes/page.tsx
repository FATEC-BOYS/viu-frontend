'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users2, Plus, Loader2, UserCheck, FolderOpen, ChevronRight, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { equipesApi, type Equipe } from '@/lib/equipes'
import { useAuth } from '@/contexts/AuthContext'

// Gera slug a partir do nome
function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function CriarEquipeModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: (e: Equipe) => void
}) {
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEditado, setSlugEditado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const handleNome = (v: string) => {
    setNome(v)
    if (!slugEditado) setSlug(toSlug(v))
  }

  const handleSlug = (v: string) => {
    setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setSlugEditado(true)
  }

  const handleClose = (v: boolean) => {
    if (!v) { setNome(''); setSlug(''); setSlugEditado(false) }
    onOpenChange(v)
  }

  const handleSubmit = async () => {
    if (!nome.trim() || !slug.trim()) return
    setEnviando(true)
    try {
      const equipe = await equipesApi.criar(nome.trim(), slug.trim())
      toast.success('Equipe criada!')
      onSuccess(equipe)
      handleClose(false)
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao criar equipe')
    } finally {
      setEnviando(false)
    }
  }

  const valido = nome.trim().length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-primary" />
            Nova equipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              placeholder="Minha Equipe"
              value={nome}
              onChange={(e) => handleNome(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Slug <span className="text-muted-foreground font-normal">(URL amigável)</span></Label>
            <div className="flex items-center rounded-md border bg-muted/40 px-3 text-sm">
              <span className="text-muted-foreground select-none pr-1">equipes/</span>
              <input
                className="flex-1 bg-transparent py-2 outline-none"
                value={slug}
                onChange={(e) => handleSlug(e.target.value)}
                placeholder="minha-equipe"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífens.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!valido || enviando}>
            {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar equipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EquipeCard({
  equipe,
  index,
  onDelete,
  isOwner,
}: {
  equipe: Equipe
  index: number
  onDelete: (id: string) => void
  isOwner: boolean
}) {
  const [deletando, setDeletando] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Excluir "${equipe.nome}"? Esta ação é irreversível.`)) return
    setDeletando(true)
    try {
      await equipesApi.deletar(equipe.id)
      toast.success('Equipe excluída')
      onDelete(equipe.id)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao excluir equipe')
    } finally {
      setDeletando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 24 }}
    >
      <Link href={`/equipes/${equipe.id}`} className="group block rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{equipe.nome}</p>
              <p className="text-xs text-muted-foreground truncate">/{equipe.slug}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {equipe._count?.membros ?? 0}
              </span>
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" />
                {equipe._count?.projetos ?? 0}
              </span>
            </div>
            {isOwner && (
              <button
                onClick={handleDelete}
                disabled={deletando}
                className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                aria-label="Excluir equipe"
              >
                {deletando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export default function EquipesPage() {
  const { user } = useAuth()
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setLoading(true)
    equipesApi.listar()
      .then(setEquipes)
      .catch(() => toast.error('Erro ao carregar equipes'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Equipes</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[3.25rem]">
            Organize designers, revisores e clientes em equipes para compartilhar projetos.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova equipe
        </Button>
      </motion.div>

      {!loading && equipes.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: 'Equipes', value: equipes.length },
            {
              label: 'Projetos vinculados',
              value: equipes.reduce((acc, e) => acc + (e._count?.projetos ?? 0), 0),
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card p-4 text-center">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : equipes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Users2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma equipe ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma equipe para começar a colaborar.
          </p>
          <Button onClick={() => setModalOpen(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Criar primeira equipe
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {equipes.map((e, i) => (
              <EquipeCard
                key={e.id}
                equipe={e}
                index={i}
                isOwner={e.donoPrincipalId === user?.id}
                onDelete={(id) => setEquipes((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      <CriarEquipeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={(e) => setEquipes((prev) => [e, ...prev])}
      />
    </div>
  )
}
