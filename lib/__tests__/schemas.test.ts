import { describe, it, expect } from 'vitest'
import { loginSchema, projetoSchema, senhaForteSchema, validarCampos } from '../schemas'

/**
 * Estes schemas espelham `viu-backend/src/schemas/validation.ts`. Os testes
 * fixam as regras que precisam continuar iguais às do servidor — se o backend
 * mudar e alguém esquecer daqui, o formulário passa a aceitar o que a API
 * recusa.
 */
describe('senhaForteSchema', () => {
  it('aceita uma senha que atende a todos os requisitos', () => {
    expect(senhaForteSchema.safeParse('Girassol#2026x').success).toBe(true)
  })

  it('recusa senha curta demais', () => {
    const r = senhaForteSchema.safeParse('Ab#1cdef')
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toContain('12 caracteres')
  })

  it('recusa senha sem caractere especial', () => {
    expect(senhaForteSchema.safeParse('Girassol2026x').success).toBe(false)
  })

  it('recusa senha comum e 3 caracteres repetidos', () => {
    expect(senhaForteSchema.safeParse('senha123').success).toBe(false)
    expect(senhaForteSchema.safeParse('Giraaassol#26').success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('não aplica regras de força — senha antiga precisa conseguir entrar', () => {
    const r = validarCampos(loginSchema, { email: 'a@b.com', senha: 'curta' })
    expect(r.ok).toBe(true)
  })

  it('aponta e-mail inválido no campo certo', () => {
    const r = validarCampos(loginSchema, { email: 'nao-e-email', senha: 'x' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros.email).toBe('Email inválido')
  })

  it('aponta senha vazia', () => {
    const r = validarCampos(loginSchema, { email: 'a@b.com', senha: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros.senha).toBe('Senha é obrigatória')
  })
})

describe('projetoSchema', () => {
  const clienteId = 'c' + 'a1b2c3d4e5f6a7b8c9d0e1f2'

  it('aceita um projeto mínimo válido', () => {
    const r = validarCampos(projetoSchema, {
      nome: 'Identidade visual',
      orcamento: 0,
      clienteId,
    })
    expect(r.ok).toBe(true)
  })

  it('exige cliente — o backend recusa sem clienteId', () => {
    const r = validarCampos(projetoSchema, { nome: 'Projeto', orcamento: 10, clienteId: null })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.erros.clienteId).toBe('Selecione o cliente')
  })

  it('recusa id fora do formato CUID do banco', () => {
    const r = validarCampos(projetoSchema, {
      nome: 'Projeto',
      orcamento: 10,
      clienteId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(r.ok).toBe(false)
  })

  it('recusa orçamento negativo e nome curto', () => {
    const r = validarCampos(projetoSchema, { nome: 'x', orcamento: -1, clienteId })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.erros.nome).toContain('2 caracteres')
      expect(r.erros.orcamento).toContain('negativo')
    }
  })
})
