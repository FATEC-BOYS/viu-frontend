import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { diaDeCalendario, diasAte, formatarDia } from '../diaDeCalendario'

/**
 * O dia precisa ser o dia, em qualquer fuso.
 *
 * Prazo é data de calendário guardada como `00:00:00` e transportada como
 * instante UTC. Lida com `new Date(iso)` no Brasil (UTC-3), a meia-noite de
 * 15/09 em UTC vira 21h de 14/09 local — e a tela mostrava o dia anterior.
 * Conferido no navegador nos dois fusos antes do conserto.
 */
const VENCE_15_SET = '2026-09-15T00:00:00.000Z'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('O dia é o mesmo em qualquer fuso', () => {
  it('extrai o dia pelos componentes UTC, que é como ele foi escrito', () => {
    const dia = diaDeCalendario(VENCE_15_SET)
    expect(dia.getDate()).toBe(15)
    expect(dia.getMonth()).toBe(8) // setembro
    expect(dia.getFullYear()).toBe(2026)
  })

  it('devolve meia-noite local, para poder comparar com o hoje de quem olha', () => {
    const dia = diaDeCalendario(VENCE_15_SET)
    expect(dia.getHours()).toBe(0)
    expect(dia.getMinutes()).toBe(0)
  })

  it('formata o dia sem deslocar', () => {
    expect(formatarDia(VENCE_15_SET, { day: '2-digit', month: '2-digit' })).toBe('15/09')
  })

  it('aceita Date além de string', () => {
    expect(formatarDia(new Date(VENCE_15_SET), { day: '2-digit', month: '2-digit' })).toBe('15/09')
  })
})

describe('Contagem de dias', () => {
  it('conta em dias de calendário, não em horas', () => {
    // 20/09 às 23h ainda é o dia 20: faltam 5 dias para o 25, não 4.
    vi.setSystemTime(new Date(2026, 8, 20, 23, 30))
    expect(diasAte('2026-09-25T00:00:00.000Z')).toBe(5)
  })

  it('o dia de hoje dá zero, mesmo de madrugada', () => {
    vi.setSystemTime(new Date(2026, 8, 20, 0, 5))
    expect(diasAte('2026-09-20T00:00:00.000Z')).toBe(0)
  })

  it('atraso é negativo — e não um dia a mais', () => {
    // Era aqui que aparecia "atrasado há 6 dias" para um vencimento de 5.
    vi.setSystemTime(new Date(2026, 8, 20, 10, 0))
    expect(diasAte(VENCE_15_SET)).toBe(-5)
  })

  it('amanhã é 1', () => {
    vi.setSystemTime(new Date(2026, 8, 20, 10, 0))
    expect(diasAte('2026-09-21T00:00:00.000Z')).toBe(1)
  })
})
