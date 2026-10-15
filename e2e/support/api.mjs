// API determinística para jornadas de navegador. Não substitui os testes do backend.
import http from 'node:http'
const id = n => 'c' + String(n).padStart(24, '0')
const designer = { id: id(1), nome: 'Designer Piloto', email: 'designer@teste.local', tipo: 'DESIGNER', emailVerificado: true }
const cliente = { id: id(2), nome: 'Cliente Piloto', email: 'cliente@teste.local', tipo: 'CLIENTE', emailVerificado: true }
const imagem = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
let projetos, artes, aprovacoes, versoes, links, falhas
function reset() {
  projetos = [{ id: id(10), nome: 'Projeto base', descricao: '', status: 'EM_ANDAMENTO', orcamento: 0, prazo: null, designerId: designer.id, clienteId: cliente.id, designer, cliente, criadoEm: '2026-10-15T12:00:00Z', _count: { artes: 0 } }]
  artes = []; aprovacoes = []; versoes = []; links = []; falhas = []
}
reset()
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101'), path = url.pathname, method = req.method
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'http://127.0.0.1:3100')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'content-type,authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  if (method === 'OPTIONS') { res.writeHead(204); return res.end() }
  const chunks = []; for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString()
  let body = {}; try { body = JSON.parse(raw) } catch { /* multipart */ }
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  const data = value => send({ data: value, success: true })
  const lista = rows => send({ data: rows, success: true, total: rows.length, pagination: { total: rows.length, page: 1, pages: 1 } })
  const field = name => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(raw)?.[1]
  const arteCompleta = a => ({ ...a, autor: designer, projeto: projetos.find(p => p.id === a.projetoId), feedbacks: [], previewUrl: imagem, arquivo_url: imagem })
  if (path === '/__reset') { reset(); return data(true) }
  if (path === '/__fail') { falhas = body.paths ?? []; return data(true) }
  if (path === '/auth/login') { const u = body.email?.startsWith('cliente') ? cliente : designer; res.setHeader('Set-Cookie', `e2e_tipo=${u.tipo}; Path=/; HttpOnly; SameSite=Lax`); return data({ usuario: u }) }
  if (path === '/auth/me') return data(req.headers.cookie?.includes('e2e_tipo=CLIENTE') ? cliente : designer)
  if (falhas.includes(path)) return send({ message: 'Falha temporária no teste' }, 503)
  if (path === '/usuarios/buscar') return data([cliente])
  if (path === '/upload/limites') return data({ maxBytes: 26214400, porCategoria: { image: 26214400, video: 26214400, audio: 26214400, document: 26214400 }, tiposPermitidos: {} })
  if (path === '/projetos' && method === 'POST') {
    const p = { ...projetos[0], ...body, id: id(11), designer, cliente, _count: { artes: 0 } }; projetos.push(p); return data(p)
  }
  if (path === '/projetos') return lista(projetos.map(p => ({ ...p, _count: { artes: artes.filter(a => a.projetoId === p.id).length } })))
  if (/^\/projetos\/[^/]+$/.test(path)) return data(projetos.find(p => p.id === path.split('/')[2]))
  if (path === '/artes/upload') {
    const a = { id: id(20), nome: field('nome') || 'Capa piloto', projetoId: field('projetoId') || id(10), versao: 1, status: 'EM_ANALISE', tipo: 'image/png', tamanho: 68, arquivo: imagem, criadoEm: new Date().toISOString(), autorId: designer.id }
    artes.push(a); return data(arteCompleta(a))
  }
  if (path === '/artes') return lista(artes.filter(a => !url.searchParams.get('projetoId') || a.projetoId === url.searchParams.get('projetoId')).map(arteCompleta))
  const arte = artes.find(a => a.id === path.split('/')[2])
  if (/^\/artes\/[^/]+\/versoes\/upload$/.test(path)) {
    if (!versoes.some(v => v.numero === arte.versao)) versoes.push({ id: id(30), ...arte, numero: arte.versao, arquivo: imagem })
    arte.versao++; arte.status = 'EM_ANALISE'; versoes.push({ ...arte, id: id(31), numero: arte.versao, arquivo: imagem }); return data(versoes.at(-1))
  }
  if (/^\/artes\/[^/]+\/versoes$/.test(path)) return data(versoes)
  if (/^\/artes\/[^/]+\/solicitar-aprovacao$/.test(path)) {
    const ap = { id: id(40 + aprovacoes.length), arteId: arte.id, arte: arteCompleta(arte), aprovador: cliente, versaoNumero: body.versaoNumero ?? arte.versao, status: 'PENDENTE', criadoEm: new Date().toISOString() }; aprovacoes.push(ap); return data(ap)
  }
  if (/^\/artes\/[^/]+$/.test(path)) return data(arteCompleta(arte))
  if (path === '/aprovacoes') return lista(aprovacoes.filter(ap => !url.searchParams.get('arteId') || ap.arteId === url.searchParams.get('arteId')).map(ap => ({ ...ap, arte: arteCompleta(artes.find(a => a.id === ap.arteId)) })))
  if (path.startsWith('/aprovacoes/') && method === 'PUT') {
    const ap = aprovacoes.find(a => a.id === path.split('/')[2]); Object.assign(ap, body, { decididoEm: new Date().toISOString() }); const a = artes.find(a => a.id === ap.arteId); if (a.versao === ap.versaoNumero) a.status = ap.status; return data(ap)
  }
  if (path === '/links' && method === 'POST') { const link = { token: 'link-piloto', url: 'http://127.0.0.1:3100/l/link-piloto', ...body }; links.push(link); return data(link) }
  if (path === '/preview/link-piloto/destino') return data({ arteId: links.at(-1)?.arteId })
  if (path === '/links/link-piloto') return data({ arteId: links.at(-1)?.arteId })
  if (path === '/preview/link-piloto') return data({ arte: arteCompleta(artes.at(-1)), feedbacks: [], somenteLeitura: false })
  if (path === '/links') return data(links)
  if (path.includes('funil')) return data({ links: 0, acessos: 0, comentarios: 0, aprovacoes: 0 })
  return lista([])
})
server.listen(3101, '127.0.0.1', () => console.log('API simulada de jornadas em 3101'))
