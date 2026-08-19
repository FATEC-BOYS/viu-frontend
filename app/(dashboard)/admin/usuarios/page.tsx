'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Search, Users } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/layout/EmptyState'
import { FadeIn } from '@/components/layout/Motion'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { iniciais } from '@/lib/iniciais'
import { adminApi, type StatsUsuarios, type UsuarioAdmin } from '@/lib/admin'

const TIPOS: Array<{ valor: string; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'DESIGNER', rotulo: 'Designers' },
  { valor: 'CLIENTE', rotulo: 'Clientes' },
  { valor: 'ADMIN', rotulo: 'Admins' },
]

const ROTULO_TIPO: Record<UsuarioAdmin['tipo'], string> = {
  DESIGNER: 'Designer',
  CLIENTE: 'Cliente',
  ADMIN: 'Admin',
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([])
  const [stats, setStats] = useState<StatsUsuarios | null>(null)
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [tipo, setTipo] = useState('todos')
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      // O endpoint de stats é independente; se ele falhar a lista ainda serve.
      const [listaRes, statsRes] = await Promise.allSettled([
        adminApi.listarUsuarios({ tipo }),
        adminApi.statsUsuarios(),
      ])
      if (listaRes.status === 'fulfilled') {
        setUsuarios(listaRes.value.data)
        setTotal(listaRes.value.pagination.total)
      } else {
        toast.error('Não foi possível carregar os usuários.')
      }
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
    } finally {
      setCarregando(false)
    }
  }, [tipo])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Busca local: o endpoint não aceita termo, e a lista cabe numa página.
  const termo = busca.trim().toLowerCase()
  const filtrados = termo
    ? usuarios.filter(
        (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
      )
    : usuarios

  return (
    <FadeIn className="mx-auto w-full max-w-7xl p-6 space-y-6">
      <PageHeader
        title="Usuários"
        description="Quem está cadastrado no VIU."
        actions={
          <Button variant="outline" size="sm" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { rotulo: 'Total', valor: stats.total, nota: `${stats.percentualAtivos}% ativos` },
            { rotulo: 'Designers', valor: stats.porTipo.designers, nota: 'contas de designer' },
            { rotulo: 'Clientes', valor: stats.porTipo.clientes, nota: 'contas de cliente' },
            { rotulo: 'Inativos', valor: stats.inativos, nota: 'contas desativadas' },
          ].map((card) => (
            <div key={card.rotulo} className="rounded-xl border bg-card p-4">
              <p className="text-xs text-muted-foreground">{card.rotulo}</p>
              <p className="text-2xl font-semibold tabular-nums">{card.valor}</p>
              <p className="text-[11px] text-muted-foreground">{card.nota}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou email…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {TIPOS.map((t) => (
          <Button
            key={t.valor}
            size="sm"
            variant={tipo === t.valor ? 'default' : 'outline'}
            className="rounded-full"
            onClick={() => setTipo(t.valor)}
          >
            {t.rotulo}
          </Button>
        ))}
      </div>

      {carregando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description={termo ? 'Tente outro termo de busca.' : 'Nenhuma conta com esse filtro.'}
        />
      ) : (
        <>
          <div className="space-y-2">
            {filtrados.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 card-interativo"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {iniciais(u.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{u.nome}</p>
                    <Badge variant="secondary">{ROTULO_TIPO[u.tipo]}</Badge>
                    {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>
            ))}
          </div>
          {filtrados.length < total && (
            <p className="text-center text-xs text-muted-foreground">
              Mostrando {filtrados.length} de {total}. Refine o filtro para ver o resto.
            </p>
          )}
        </>
      )}
    </FadeIn>
  )
}
