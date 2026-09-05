import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

import { api } from '@/lib/api'
import {
  validarTamanho,
  categoriaDoMime,
  getLimitesUpload,
  _limparCacheLimites,
} from '../uploadLimits'

const MB = 1024 * 1024

const LIMITES = {
  data: {
    maxBytes: 25 * MB,
    // video vem 25 e não 100: o backend já corta a promessa pelo teto do
    // multipart antes de responder.
    porCategoria: { image: 10 * MB, video: 25 * MB, audio: 25 * MB, document: 20 * MB },
    tiposPermitidos: { 'image/png': ['.png'] },
  },
}

function arquivo(tamanho: number, tipo: string): File {
  return { size: tamanho, type: tipo, name: 'x' } as File
}

beforeEach(() => {
  vi.clearAllMocks()
  _limparCacheLimites()
})

describe('categoriaDoMime', () => {
  it('classifica pelos prefixos e cai em document no resto', () => {
    expect(categoriaDoMime('image/png')).toBe('image')
    expect(categoriaDoMime('video/mp4')).toBe('video')
    expect(categoriaDoMime('audio/webm')).toBe('audio')
    expect(categoriaDoMime('application/pdf')).toBe('document')
    expect(categoriaDoMime('')).toBe('document')
  })
})

describe('validarTamanho', () => {
  it('aprova arquivo dentro do limite da categoria', async () => {
    vi.mocked(api.get).mockResolvedValue(LIMITES as any)
    await expect(validarTamanho(arquivo(5 * MB, 'image/png'))).resolves.toBeNull()
  })

  it('recusa imagem acima de 10MB mesmo estando abaixo do teto global', async () => {
    vi.mocked(api.get).mockResolvedValue(LIMITES as any)
    const erro = await validarTamanho(arquivo(15 * MB, 'image/png'))
    expect(erro).toMatch(/15MB.*10MB/)
  })

  it('recusa vídeo de 40MB — o limite real é 25, não os 100 que a categoria promete', async () => {
    // Este é o caso que o número copiado no ArteWizard deixava passar: subia
    // inteiro e morria no servidor com erro genérico.
    vi.mocked(api.get).mockResolvedValue(LIMITES as any)
    const erro = await validarTamanho(arquivo(40 * MB, 'video/mp4'))
    expect(erro).toMatch(/25MB/)
  })

  it('deixa passar quando o backend não responde — quem valida é o servidor', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('rede'))
    await expect(validarTamanho(arquivo(999 * MB, 'video/mp4'))).resolves.toBeNull()
  })

  it('usa maxBytes quando a categoria não está na resposta', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { ...LIMITES.data, porCategoria: {} },
    } as any)
    const erro = await validarTamanho(arquivo(30 * MB, 'image/png'))
    expect(erro).toMatch(/25MB/)
  })
})

describe('getLimitesUpload', () => {
  it('consulta o backend uma vez só e reusa o resultado', async () => {
    vi.mocked(api.get).mockResolvedValue(LIMITES as any)

    await Promise.all([getLimitesUpload(), getLimitesUpload(), getLimitesUpload()])

    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
