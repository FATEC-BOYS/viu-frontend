/*
 * Mede transbordo horizontal em largura de celular.
 *
 * Existe porque um passe de design inteiro foi feito a 1280px e nenhuma tela
 * foi olhada num telefone: a "Zona de perigo" de /configuracoes tinha dois
 * botões somando 280px fixos numa tela de 390px, e "Excluir minha conta" — o
 * botão que ninguém deve apertar sem ler — ficava cortado na borda.
 *
 * Reporta quem ultrapassa a borda direita MESMO quando a página não rola: o
 * transbordo costuma ser recortado por um `overflow` acima, então
 * `scrollWidth > clientWidth` sozinho não acusa nada.
 *
 * Uso:
 *   node .claude/skills/rodar-viu/scripts/conferir-mobile.mjs designer@viu.com /projetos /faturas
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'

const LARGURA = Number(process.env.LARGURA ?? 390)
const APP = process.env.APP ?? 'http://localhost:3000'
const [email, ...rotas] = process.argv.slice(2)

if (!email || rotas.length === 0) {
  console.error('uso: conferir-mobile.mjs <email> <rota> [rota...]')
  process.exit(2)
}

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: LARGURA, height: 844 },
  deviceScaleFactor: 2,
})
const pagina = await contexto.newPage()

await pagina.goto(`${APP}/login`, { waitUntil: 'networkidle' })
await pagina.fill('input[type=email]', email)
await pagina.fill('input[type=password]', process.env.SENHA ?? '123456')
await pagina.click('button[type=submit]')
await pagina.waitForURL(/dashboard|projetos/, { timeout: 20000 }).catch(() => {})

let problemas = 0

for (const rota of rotas) {
  await pagina.goto(`${APP}${rota}`, { waitUntil: 'networkidle' }).catch(() => {})
  await pagina.waitForTimeout(1200)

  const achados = await pagina.evaluate((largura) => {
    const fora = []
    for (const el of document.querySelectorAll('body *')) {
      // Decoração que vaza de propósito (brilhos, blobs) não conta.
      if (getComputedStyle(el).pointerEvents === 'none') continue
      const caixa = el.getBoundingClientRect()
      if (caixa.width === 0 || caixa.height === 0) continue
      if (caixa.right > largura + 1) {
        fora.push({
          sobra: Math.round(caixa.right - largura),
          tag: el.tagName.toLowerCase(),
          classe: (el.className || '').toString().slice(0, 60),
          texto: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        })
      }
    }
    return fora.slice(0, 5)
  }, LARGURA)

  if (achados.length === 0) {
    console.log(`ok          ${rota}`)
    continue
  }

  problemas += 1
  console.log(`TRANSBORDA  ${rota}`)
  for (const a of achados) {
    console.log(`   +${String(a.sobra).padStart(3)}px <${a.tag}> ${a.classe}`)
    console.log(`        "${a.texto}"`)
  }
}

await navegador.close()
process.exit(problemas > 0 ? 1 : 0)
