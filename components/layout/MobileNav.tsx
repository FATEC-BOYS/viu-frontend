'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/Sidebar'

/**
 * Navegação do celular.
 *
 * A barra lateral não tinha comportamento responsivo nenhum: largura fixa de
 * 16rem (ou 4rem recolhida) dentro de um flex, em qualquer tela. Num aparelho
 * de 400px ela comia a largura e o conteúdo se espremia no que sobrava.
 *
 * Aqui ela sai do fluxo abaixo de `md` e passa a morar numa gaveta, com a
 * largura inteira devolvida ao conteúdo.
 */
export function MobileNav() {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()

  // Gaveta que não fecha ao navegar deixa a pessoa olhando o menu depois de
  // já ter escolhido para onde ir.
  useEffect(() => {
    setAberto(false)
  }, [pathname])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setAberto(true)}
        aria-label="Abrir menu de navegação"
        aria-expanded={aberto}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="left" className="w-[17rem] p-0">
          <Sidebar semColapso />
        </SheetContent>
      </Sheet>
    </>
  )
}
