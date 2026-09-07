import { describe, it, expect } from 'vitest'
import { generateWhatsAppLink, normalizarTelefone, montarMensagem } from '../whatsapp'

const BASE = {
  projectName: 'Campanha de Verão',
  reviewUrl: 'https://viu.app/shared/tok123',
}

describe('normalizarTelefone', () => {
  it('aceita o formato que a pessoa realmente digita', () => {
    expect(normalizarTelefone('(11) 91234-5678')).toBe('5511912345678')
    expect(normalizarTelefone('11 91234 5678')).toBe('5511912345678')
    expect(normalizarTelefone('+55 11 91234-5678')).toBe('5511912345678')
  })

  it('aceita fixo de 10 dígitos', () => {
    expect(normalizarTelefone('1132145678')).toBe('551132145678')
  })

  /**
   * A armadilha: DDD 55 existe (Santa Maria/RS). `5599998888` é um número
   * local de 10 dígitos, não um número que já traz o código do país. Decidir
   * pelo prefixo mandaria a mensagem para outro telefone, em silêncio — por
   * isso a regra é por tamanho.
   */
  it('não confunde DDD 55 com código do país', () => {
    expect(normalizarTelefone('5599998888')).toBe('555599998888')
    expect(normalizarTelefone('55999998888')).toBe('5555999998888')
  })

  it('reconhece número que já vem com código do país', () => {
    expect(normalizarTelefone('5511912345678')).toBe('5511912345678')
    expect(normalizarTelefone('551132145678')).toBe('551132145678')
  })

  it('recusa o que não dá para adivinhar em vez de chutar', () => {
    expect(normalizarTelefone('')).toBeNull()
    expect(normalizarTelefone('12345')).toBeNull()
    expect(normalizarTelefone('abc')).toBeNull()
    // 12 dígitos sem o 55 na frente: não é BR nacional nem BR internacional.
    expect(normalizarTelefone('119123456789')).toBeNull()
  })
})

describe('generateWhatsAppLink', () => {
  it('monta o wa.me com o número normalizado', () => {
    const r = generateWhatsAppLink({ ...BASE, phone: '(11) 91234-5678' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.url.startsWith('https://wa.me/5511912345678?text=')).toBe(true)
  })

  it('codifica a mensagem — quebra de linha e acento não podem vazar crus', () => {
    const r = generateWhatsAppLink({ ...BASE, phone: '11912345678' })
    if (!r.ok) throw new Error('esperava sucesso')

    const texto = new URL(r.url).searchParams.get('text')
    expect(texto).toContain('Campanha de Verão')
    expect(texto).toContain(BASE.reviewUrl)
    // A URL crua não pode conter quebra de linha literal.
    expect(r.url).not.toMatch(/\n/)
  })

  it('distingue os motivos de recusa em vez de falhar genérico', () => {
    expect(generateWhatsAppLink({ ...BASE, phone: '   ' })).toEqual({
      ok: false,
      motivo: 'telefone-vazio',
    })
    expect(generateWhatsAppLink({ ...BASE, phone: '123' })).toEqual({
      ok: false,
      motivo: 'telefone-invalido',
    })
  })

  /** Sem isto, um `reviewUrl` vindo de fora viraria link clicável. */
  it('recusa link que não seja http(s)', () => {
    expect(
      generateWhatsAppLink({ ...BASE, phone: '11912345678', reviewUrl: 'javascript:alert(1)' }),
    ).toEqual({ ok: false, motivo: 'link-invalido' })

    expect(
      generateWhatsAppLink({ ...BASE, phone: '11912345678', reviewUrl: '' }),
    ).toEqual({ ok: false, motivo: 'link-invalido' })
  })
})

describe('montarMensagem', () => {
  it('usa negrito do WhatsApp no nome do projeto', () => {
    expect(montarMensagem('Rebrand', 'https://x.y/z')).toContain('*Rebrand*')
  })

  it('não deixa o texto quebrado quando o projeto vem sem nome', () => {
    expect(montarMensagem('   ', 'https://x.y/z')).toContain('*seu projeto*')
  })
})
