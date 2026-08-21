import { z } from 'zod'

/**
 * Schemas de validação do lado do cliente.
 *
 * São um espelho de `viu-backend/src/schemas/validation.ts` — mesmas regras,
 * mesmas mensagens. O backend continua sendo a autoridade: isto existe para
 * que a pessoa descubra o problema antes de enviar o formulário, não para
 * substituir a validação do servidor.
 *
 * Ao mudar uma regra lá, mude aqui também.
 */

/** Senhas triviais recusadas pelo backend. */
const senhasComuns = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345',
  '1234', '111111', '1234567', 'dragon', '123123', 'baseball',
  'iloveyou', 'trustno1', '1234567890', 'sunshine', 'master',
  'welcome', 'shadow', 'ashley', 'football', 'jesus', 'michael',
  'ninja', 'mustang', 'password1', 'senha123', 'senha',
]

export const senhaForteSchema = z
  .string()
  .min(12, 'Senha deve ter pelo menos 12 caracteres')
  .max(128, 'Senha deve ter no máximo 128 caracteres')
  .refine((senha) => /[a-z]/.test(senha), {
    message: 'Senha deve conter pelo menos uma letra minúscula',
  })
  .refine((senha) => /[A-Z]/.test(senha), {
    message: 'Senha deve conter pelo menos uma letra maiúscula',
  })
  .refine((senha) => /[0-9]/.test(senha), {
    message: 'Senha deve conter pelo menos um número',
  })
  .refine((senha) => /[^a-zA-Z0-9]/.test(senha), {
    message: 'Senha deve conter pelo menos um caractere especial (!@#$%^&*)',
  })
  .refine((senha) => !senhasComuns.includes(senha.toLowerCase()), {
    message: 'Esta senha é muito comum e insegura. Escolha uma senha mais forte.',
  })
  .refine((senha) => !/(.)\1{2,}/.test(senha), {
    message: 'Senha não deve conter mais de 2 caracteres repetidos consecutivos',
  })

export const loginSchema = z.object({
  email: z.string().min(1, 'Informe seu e-mail').email('Email inválido'),
  // No login a senha não passa pelas regras de força: quem tem senha antiga
  // precisa conseguir entrar para poder trocá-la.
  senha: z.string().min(1, 'Senha é obrigatória'),
})

export const cadastroSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().min(1, 'Informe seu e-mail').email('Email inválido'),
  senha: senhaForteSchema,
  tipo: z.enum(['DESIGNER', 'CLIENTE'], {
    required_error: 'Escolha se você é designer ou cliente',
  }),
})

// Os ids do banco são CUIDs ('c' + 24 hex), não UUIDs.
const cuid = z.string().regex(/^c[a-z0-9]{24}$/i, 'Selecione uma opção válida')

export const projetoSchema = z.object({
  nome: z.string().trim().min(2, 'Nome do projeto deve ter pelo menos 2 caracteres'),
  descricao: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  // Em reais na interface; o backend recebe centavos.
  orcamento: z
    .number({ invalid_type_error: 'Informe um valor numérico' })
    .nonnegative('Orçamento não pode ser negativo'),
  clienteId: cuid.nullable().refine((v) => v !== null, { message: 'Selecione o cliente' }),
  equipeId: cuid.nullable().optional(),
  prazo: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), { message: 'Prazo inválido' }),
})

export type ErrosDeCampo<T> = Partial<Record<keyof T, string>>

/**
 * Roda um schema e devolve o primeiro erro de cada campo, na forma que os
 * formulários usam para preencher `aria-describedby`.
 */
export function validarCampos<T extends z.ZodTypeAny>(
  schema: T,
  valores: unknown,
): { ok: true; dados: z.infer<T> } | { ok: false; erros: Record<string, string> } {
  const resultado = schema.safeParse(valores)
  if (resultado.success) return { ok: true, dados: resultado.data }

  const erros: Record<string, string> = {}
  for (const issue of resultado.error.issues) {
    const campo = String(issue.path[0] ?? '_')
    if (!erros[campo]) erros[campo] = issue.message
  }
  return { ok: false, erros }
}
