'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { solicitarAprovacao } from '@/lib/projects'
import { listVersoes } from '@/lib/artes'

/**
 * O designer pede; o cliente decide.
 *
 * A pendência nasce no nome do cliente do projeto — quem clica aqui não é
 * quem vai responder, e por isso não há escolha de aprovador: o backend lê o
 * `clienteId` do projeto e ignora qualquer coisa que viesse do corpo.
 *
 * Só a lista de versões vem daqui, e vem do backend: nunca montamos números de
 * versão no cliente.
 */

export type ArteParaAprovacao = {
  id: string
  nome: string
  versaoAtual: number
}

export default function SolicitarAprovacaoDialog({
  artes,
  onSolicitado,
}: {
  artes: ArteParaAprovacao[]
  onSolicitado?: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [arteId, setArteId] = useState<string>('')
  const [versao, setVersao] = useState<string>('')
  const [versoes, setVersoes] = useState<number[]>([])
  const [enviando, setEnviando] = useState(false)

  const arte = artes.find((a) => a.id === arteId)

  // As versões vêm de GET /artes/:id/versoes. A arte sempre tem a versão
  // corrente mesmo sem histórico: createArte não cria linha em ArteVersao, então
  // a v1 não aparece naquela lista e precisa entrar por fora.
  useEffect(() => {
    let vivo = true
    if (!arteId || !arte) {
      setVersoes([])
      return
    }

    setVersao(String(arte.versaoAtual))
    listVersoes(arteId)
      .then((grupos) => {
        if (!vivo) return
        const numeros = new Set<number>(grupos.map((g) => g.versao))
        numeros.add(arte.versaoAtual)
        setVersoes([...numeros].sort((a, b) => b - a))
      })
      .catch(() => {
        if (vivo) setVersoes([arte.versaoAtual])
      })

    return () => {
      vivo = false
    }
  }, [arteId, arte])

  async function enviar() {
    if (!arteId) return
    setEnviando(true)
    try {
      await solicitarAprovacao(arteId, versao ? Number(versao) : undefined)
      toast.success('Aprovação solicitada', {
        description: 'O cliente do projeto foi avisado de que há algo esperando por ele.',
      })
      setAberto(false)
      setArteId('')
      onSolicitado?.()
    } catch (e: any) {
      toast.error(e?.message ?? 'Não foi possível solicitar a aprovação.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={artes.length === 0}>
          Solicitar aprovação
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar aprovação</DialogTitle>
          <DialogDescription>
            O cliente do projeto recebe a pendência e decide. Você não aprova no lugar dele.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="arte">Arte</Label>
            <Select value={arteId} onValueChange={setArteId}>
              <SelectTrigger id="arte">
                <SelectValue placeholder="Escolha a arte" />
              </SelectTrigger>
              <SelectContent>
                {artes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {arte && (
            <div className="space-y-2">
              <Label htmlFor="versao">Versão</Label>
              <Select value={versao} onValueChange={setVersao}>
                <SelectTrigger id="versao">
                  <SelectValue placeholder="Escolha a versão" />
                </SelectTrigger>
                <SelectContent>
                  {(versoes.length ? versoes : [arte.versaoAtual]).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      v{n}
                      {n === arte.versaoAtual ? ' — atual' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={!arteId || enviando}>
            {enviando ? 'Enviando…' : 'Solicitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
