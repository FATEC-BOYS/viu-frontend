'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { listAllProjetos, type Projeto } from '@/lib/projects'
import { rotuloProjeto } from '@/lib/rotulos'
import { formatarDia } from '@/lib/diaDeCalendario'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Navegação do cliente: contratos e entregas, sem ferramentas de produção. */
export default function ProjetosDoCliente({ usuarioId }: { usuarioId: string }) {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(false)
    try {
      const todos = await listAllProjetos()
      setProjetos(todos.filter(p => p.cliente.id === usuarioId))
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [usuarioId])
  useEffect(() => { void carregar() }, [carregar])
  const visiveis = projetos.filter(p => p.nome.toLocaleLowerCase().includes(busca.toLocaleLowerCase()))
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Seus projetos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe as entregas e abra um projeto para revisar as artes.</p>
      </header>
      <Button asChild variant="ghost" size="sm"><Link href="/dashboard">Voltar ao painel</Link></Button>
      {carregando ? <p role="status">Carregando seus projetos…</p> : erro ? (
        <section role="alert" className="rounded-xl border p-4">
          <p>Não foi possível carregar seus projetos.</p>
          <Button onClick={() => void carregar()} className="mt-2" variant="outline">Tentar novamente</Button>
        </section>
      ) : (
        <>
          <Input aria-label="Buscar seus projetos" placeholder="Buscar pelo nome do projeto…" value={busca} onChange={e => setBusca(e.target.value)} />
          {visiveis.length === 0 ? <p className="rounded-xl border p-5 text-sm text-muted-foreground">{busca ? 'Nenhum projeto com esse nome.' : 'Quando você participar de um projeto como cliente, ele aparece aqui.'}</p> : (
            <ul className="divide-y rounded-xl border bg-card">
              {visiveis.map(p => (
                <li key={p.id}>
                  <Link href={`/projetos/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40">
                    <div className="min-w-0">
                      <h2 className="font-medium break-words">{p.nome}</h2>
                      <p className="text-sm text-muted-foreground">Com {p.designer.nome || 'seu designer'}{p.prazo && ` · Entrega: ${formatarDia(p.prazo)}`}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{rotuloProjeto(p.status)}</span>
                    <span className="text-sm font-medium">Ver entregas</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
