'use client'

import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { generateWhatsAppLink, MOTIVO_LEGIVEL } from '@/lib/whatsapp'

/**
 * Abre o WhatsApp já com a mensagem escrita.
 *
 * O verde é o único ponto fora da paleta do sistema, e é de propósito: é o
 * sinal de que a ação sai da plataforma. `emerald-700` e não `emerald-600`
 * porque o texto é branco — 600 dá 3,8:1 contra branco, abaixo do mínimo
 * legível; 700 dá 5,5:1 e passa nos dois temas, por ser preenchimento sólido.
 *
 * A validação mora em `lib/whatsapp.ts` e devolve o motivo. Se falhar, a aba
 * não abre: melhor um toast dizendo o que faltou do que uma aba em branco
 * deixando o designer achar que enviou.
 */
export default function ShareWhatsAppButton({
  phone,
  projectName,
  reviewUrl,
  className,
  size = 'default',
  children,
}: {
  phone: string
  projectName: string
  reviewUrl: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
  children?: React.ReactNode
}) {
  function enviar() {
    const resultado = generateWhatsAppLink({ phone, projectName, reviewUrl })

    if (!resultado.ok) {
      toast.error(MOTIVO_LEGIVEL[resultado.motivo])
      return
    }

    // `noopener` corta o acesso da aba nova ao `window.opener`.
    const aba = window.open(resultado.url, '_blank', 'noopener,noreferrer')

    if (!aba) {
      toast.error('O navegador bloqueou a janela.', {
        description: 'Libere pop-ups para este site e tente de novo.',
      })
      return
    }

    toast.success('WhatsApp aberto', {
      description: 'A mensagem já vai escrita — é só confirmar o envio por lá.',
    })
  }

  return (
    <Button
      type="button"
      size={size}
      onClick={enviar}
      className={cn(
        'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700/40',
        className,
      )}
    >
      <MessageCircle aria-hidden className="size-4" strokeWidth={1.75} />
      {children ?? 'Enviar por WhatsApp'}
    </Button>
  )
}
