'use client'

import { useState } from 'react'
import { Check, Copy, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildShareUrl } from '@/lib/helpers'
import ShareWhatsAppButton from './ShareWhatsAppButton'

/**
 * Exemplo de integração: mandar o link de revisão sem sair da plataforma.
 *
 * Por padrão a URL vem de `buildShareUrl` (`/shared/:token`, que o rewrite em
 * next.config leva para `/l/:token`). Quem já tem a URL na mão passa em
 * `reviewUrl`: o repo hoje monta esse link de duas formas — a página de links
 * usa `/l/:token` direto — e é pior a tela copiar um endereço e enviar outro
 * do que conviver com as duas até alguém unificar.
 *
 * Sobre o telefone: `Usuario.telefone` existe e é preenchido na criação do
 * cliente, mas o app não expõe rota para atualizar depois. Então o que for
 * digitado aqui vale só para este envio, e o rótulo diz isso. Fingir que
 * salva seria pior do que não oferecer.
 */
export default function EnviarLinkDialog({
  token,
  projectName,
  clientName,
  clientPhone,
  reviewUrl: reviewUrlProp,
}: {
  token: string | null
  projectName: string
  clientName?: string | null
  /** Telefone salvo no cadastro do cliente, quando houver. */
  clientPhone?: string | null
  /** URL já pronta. Sem isto, cai no `buildShareUrl` do token. */
  reviewUrl?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [telefone, setTelefone] = useState(clientPhone ?? '')
  const [copiado, setCopiado] = useState(false)

  const reviewUrl = reviewUrlProp ?? buildShareUrl(token)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(reviewUrl)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1600)
    } catch {
      toast.error('Não foi possível copiar o link.')
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={!token}>
          <Send aria-hidden className="size-4" strokeWidth={1.75} />
          Enviar ao cliente
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar link de revisão</DialogTitle>
          <DialogDescription>
            {clientName
              ? `${clientName} abre pelo link, comenta na arte e aprova. Sem instalar nada.`
              : 'O cliente abre pelo link, comenta na arte e aprova. Sem instalar nada.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="link-revisao">Link</Label>
            <div className="flex gap-2">
              <Input
                id="link-revisao"
                readOnly
                value={reviewUrl}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copiar}
                aria-label="Copiar link"
              >
                {copiado ? (
                  <Check aria-hidden className="size-4 text-emerald-600" />
                ) : (
                  <Copy aria-hidden className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp-cliente">WhatsApp do cliente</Label>
            <Input
              id="whatsapp-cliente"
              inputMode="tel"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {clientPhone
                ? 'Vem do cadastro do cliente. Editar aqui vale só para este envio.'
                : 'Não há telefone no cadastro. O número vale só para este envio.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Fechar
          </Button>
          <ShareWhatsAppButton
            phone={telefone}
            projectName={projectName}
            reviewUrl={reviewUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
