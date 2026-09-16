'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

/**
 * "É a sua vez" no lugar onde o cliente está: embaixo, no celular.
 *
 * O caminho antigo para decidir pelo telefone tinha três toques e nenhum
 * aviso: a única alça na base dizia "Comentários" e contava comentários; a aba
 * "Aprovações" só existia dentro da gaveta; e os botões eram `size="sm"` num
 * cartão. No desktop a coluna de 380px deixava tudo à vista — some justamente
 * no aparelho em que o link é aberto.
 *
 * Some sozinha quando não é a vez de quem está olhando, então não disputa
 * espaço com a arte no resto do tempo.
 */

export default function BarraDecisao({
  versaoNumero,
  decidindo,
  aoDecidir,
}: {
  versaoNumero: number | null
  decidindo: boolean
  aoDecidir: (
    status: 'APROVADO' | 'REJEITADO',
    comentario?: string,
  ) => Promise<{ ok: boolean; erro?: string }>
}) {
  const [pedindoAjuste, setPedindoAjuste] = useState(false)
  const [motivo, setMotivo] = useState('')

  async function decidir(status: 'APROVADO' | 'REJEITADO', comentario?: string) {
    const r = await aoDecidir(status, comentario)
    if (!r.ok) {
      toast.error(r.erro ?? 'Não foi possível registrar a decisão.')
      return
    }
    toast.success(status === 'APROVADO' ? 'Arte aprovada' : 'Pedido de ajuste enviado')
    setPedindoAjuste(false)
    setMotivo('')
  }

  return (
    <div className="shrink-0 border-t border-primary/25 bg-primary/[0.06] px-4 py-3 lg:hidden">
      <p className="text-sm font-medium">
        Esta versão aguarda sua decisão
        {versaoNumero ? (
          <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
            v{versaoNumero}
          </span>
        ) : null}
      </p>

      {pedindoAjuste ? (
        <div className="mt-2 flex flex-col gap-2">
          {/*
            O motivo não é gentileza: sem ele o designer recebe de volta o que
            já tinha. O backend recusa REJEITADO sem comentário (422
            RECUSA_SEM_MOTIVO) — o botão travado aqui só evita que a pessoa
            descubra a regra levando um erro.
          */}
          <Textarea
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O que precisa mudar?"
            className="min-h-20 text-sm"
          />
          <div className="flex gap-2">
            <Button
              className="h-12 flex-1"
              disabled={decidindo || motivo.trim().length === 0}
              onClick={() => decidir('REJEITADO', motivo.trim())}
            >
              {decidindo ? 'Enviando…' : 'Enviar pedido'}
            </Button>
            <Button
              variant="ghost"
              className="h-12"
              disabled={decidindo}
              onClick={() => {
                setPedindoAjuste(false)
                setMotivo('')
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        /* `h-12` e largura dividida: é o alvo de toque, não um botão de
           formulário. O polegar precisa acertar sem zoom. */
        <div className="mt-2 flex gap-2">
          <Button className="h-12 flex-1" disabled={decidindo} onClick={() => decidir('APROVADO')}>
            {decidindo ? 'Enviando…' : 'Aprovar'}
          </Button>
          <Button
            variant="outline"
            className="h-12 flex-1"
            disabled={decidindo}
            onClick={() => setPedindoAjuste(true)}
          >
            Pedir ajustes
          </Button>
        </div>
      )}
    </div>
  )
}
