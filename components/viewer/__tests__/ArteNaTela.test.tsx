import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import ArteNaTela from '../ArteNaTela'
import { api } from '@/lib/api'
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
vi.mock('../ViewerShell', () => ({ default: ({ arte, readOnly, initialFeedbacks, historica, onFeedbacksChange }: any) => <div><button onClick={() => onFeedbacksChange([...initialFeedbacks, { id: "novo", conteudo: "Acabei de comentar", versao_numero: arte.versao }])}>Comentar no teste</button><img alt="Peça" src={arte.arquivo} /><span>{readOnly ? 'Leitura' : 'Escrita'}</span><span>{historica ? 'Histórica' : 'Atual'}</span>{initialFeedbacks.map((f: any) => <p key={f.id}>{f.conteudo}</p>)}</div> }))
const d = { arte: { id: 'a', versao: 2, nome: 'Capa', previewUrl: 'https://img/v2.png' }, feedbacks: [{ id: 'f1', conteudo: 'Pedido da v1', versaoNumero: 1 }, { id: 'f2', conteudo: 'Pedido da v2', versaoNumero: 2 }] }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'v1', numero: 1, arquivoUrl: 'https://img/v1.png', tipo: 'image/png', descricao: 'Primeira entrega', criadoEm: '2026-10-14' }, { id: 'v2', numero: 2, descricao: 'Título aumentado' }] } as never) })
it('troca arquivo e comentários juntos e deixa a versão anterior somente para consulta', async () => {
  render(<ArteNaTela token="tok" d={d} />)
  expect(await screen.findByText('O que mudou: Título aumentado')).toBeInTheDocument()
  expect(screen.queryByText('Pedido da v1')).not.toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText('Versão exibida'), '1')
  expect(screen.getByAltText('Peça')).toHaveAttribute('src', 'https://img/v1.png')
  expect(screen.getByText('Pedido da v1')).toBeInTheDocument()
  expect(screen.queryByText('Pedido da v2')).not.toBeInTheDocument()
  expect(screen.getByText('Leitura')).toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText('Versão exibida'), '2')
  expect(screen.getByText('Escrita')).toBeInTheDocument()
})
it('informa falha no histórico e permite recuperar', async () => {
  vi.mocked(api.get).mockRejectedValueOnce(new Error('rede'))
  render(<ArteNaTela token="tok" d={d} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o histórico')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(api.get).toHaveBeenCalledWith('/preview/tok/versoes')
})

it('preserva o comentário recém-enviado ao consultar uma versão anterior e voltar', async () => {
  render(<ArteNaTela token="tok" d={d} />)
  await screen.findByText('O que mudou: Título aumentado')
  await userEvent.click(screen.getByRole('button', { name: 'Comentar no teste' }))
  await userEvent.selectOptions(screen.getByLabelText('Versão exibida'), '1')
  expect(screen.queryByText('Acabei de comentar')).not.toBeInTheDocument()
  await userEvent.selectOptions(screen.getByLabelText('Versão exibida'), '2')
  expect(screen.getByText('Acabei de comentar')).toBeInTheDocument()
})
