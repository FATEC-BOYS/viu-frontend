'use client'

import { useAuth } from '@/contexts/AuthContext'
import { FadeIn } from '@/components/layout/Motion'
import AguardandoVoce from '@/components/dashboard/AguardandoVoce'
import PainelDoDesigner from '@/components/dashboard/PainelDoDesigner'
import PainelDoCliente from '@/components/dashboard/PainelDoCliente'
import PainelDoAdmin from '@/components/dashboard/PainelDoAdmin'

/**
 * O roteador do painel — e a razão de ele existir.
 *
 * Havia uma tela só, a do designer, servida a todo mundo. O cliente entrava e
 * lia "3 feedbacks esperando você — o cliente comentou e ainda não teve
 * resposta", via "Parado no cliente" (ele é o cliente) e uma trilha de
 * onboarding pedindo que subisse a primeira arte. O único `isDesigner` que
 * existia trocava a origem das faturas e nada mais.
 *
 * `AguardandoVoce` fica aqui em cima, fora da ramificação, porque é dos dois:
 * um designer também é cliente nos projetos de outra pessoa, e ramificar por
 * papel esconderia dele a própria fila. Quem manda na presença da faixa é o
 * dado — ela some sozinha quando não há nada pendente.
 */
export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    // Nada de painel provisório: montar o do designer enquanto `/auth/me` não
    // respondeu faria o cliente ver a tela errada piscar antes da certa.
    return <FadeIn className="mx-auto w-full max-w-7xl p-4 sm:p-6" />
  }

  const ehCliente = user?.tipo === 'CLIENTE'
  const ehAdmin = user?.tipo === 'ADMIN'
  const primeiroNome = (user?.nome ?? '').trim().split(/\s+/)[0] || 'tudo bem'

  /*
   * O admin coordena a plataforma; a visão dele é macro.
   *
   * A ramificação parava no cliente, então ADMIN caía no `else` e recebia o
   * painel do designer. E como `getAccessibleProjectIds` devolve `null` para
   * admin — que significa "sem restrição" —, as consultas por trás dele
   * devolviam a plataforma inteira, apresentada com as palavras de quem
   * trabalha: "3 feedbacks esperando você" sobre comentários que esperavam
   * outra pessoa, "Seus projetos" sobre projetos alheios, e a trilha de
   * primeiros passos marcada como concluída pelo trabalho dos outros.
   *
   * Nenhum número ali era dele. É o mesmo defeito que esta página já tinha
   * corrigido para o cliente — a correção só não tinha chegado no terceiro
   * papel.
   */
  if (ehAdmin) return <PainelDoAdmin />

  /*
   * A fila entra em lugares diferentes de propósito. No painel do cliente ela
   * é o bloco principal, vem depois da saudação e tem estado vazio próprio —
   * por isso quem a monta é ele. No do designer é uma faixa de exceção (ele
   * também é cliente nos projetos de outra pessoa) e fica acima de tudo,
   * sumindo sozinha quando não há nada.
   */
  return (
    /* Larguras diferentes porque os conteúdos são: o painel do designer é uma
       grade de duas colunas e quer os 7xl; o do cliente é uma coluna de
       cartões, e esticar isso na largura toda espalha três cartões numa
       fileira rala com muito vão entre eles. */
    <FadeIn
      className={
        ehCliente
          ? 'mx-auto w-full max-w-5xl p-4 pb-16 sm:p-6 sm:pb-20'
          : 'mx-auto w-full max-w-7xl p-4 sm:p-6'
      }
    >
      {ehCliente ? (
        <PainelDoCliente nome={primeiroNome} usuarioId={user?.id ?? null} />
      ) : (
        <div className="space-y-6">
          <AguardandoVoce usuarioId={user?.id ?? null} />
          <PainelDoDesigner />
        </div>
      )}
    </FadeIn>
  )
}
