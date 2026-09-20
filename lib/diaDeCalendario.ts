/**
 * Prazo é um dia, não um instante.
 *
 * `projetos.prazo`, `tarefas.prazo` e `faturas.dataVencimento` guardam sempre
 * `00:00:00` — são datas de calendário. Mas viajam como instante UTC
 * (`2026-09-15T00:00:00.000Z`), e `new Date(iso)` no navegador resolve isso no
 * fuso de quem está olhando. No Brasil (UTC-3) a meia-noite de 15/09 em UTC é
 * 21h de 14/09 local: a tela mostrava o dia ANTERIOR.
 *
 * Medido no navegador, na mesma fatura e no mesmo projeto:
 *
 *   UTC                 atrasado há 5 dias · 15/09   |  01/10
 *   America/Sao_Paulo   atrasado há 6 dias · 14/09   |  30/09
 *
 * Toda data um dia antes, todo atraso um dia a mais — para todo usuário
 * brasileiro, num produto cuja premissa é prazo. E a tela de Faturas discordava
 * das outras, porque lá quem formata é o servidor.
 *
 * O conserto é na leitura: extrair o dia pelos componentes UTC (que é como ele
 * foi escrito) e devolvê-lo como meia-noite LOCAL, para poder ser comparado com
 * o "hoje" de quem está olhando e formatado sem novo deslocamento.
 */
export function diaDeCalendario(iso: string | Date): Date {
  const d = iso instanceof Date ? iso : new Date(iso)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/** O dia de hoje para quem está olhando, à meia-noite local. */
export function hojeLocal(): Date {
  const agora = new Date()
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
}

/**
 * Quantos dias faltam (negativo = atrasado).
 *
 * Conta em dias de calendário, não em horas: o que se quer saber é "venceu
 * ontem" ou "vence amanhã", e isso não muda porque agora são 23h.
 */
export function diasAte(iso: string | Date): number {
  return Math.round((diaDeCalendario(iso).getTime() - hojeLocal().getTime()) / 86_400_000)
}

/** A data do dia, escrita em pt-BR, sem o deslocamento de fuso. */
export function formatarDia(
  iso: string | Date,
  opcoes: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  return diaDeCalendario(iso).toLocaleDateString('pt-BR', opcoes)
}
