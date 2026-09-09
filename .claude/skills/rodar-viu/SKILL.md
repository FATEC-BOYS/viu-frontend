---
name: rodar-viu
description: Sobe o VIU inteiro localmente (Postgres efêmero + viu-backend + viu-frontend) e dirige o app pelo navegador com Playwright. Use sempre que a tarefa envolver ver o app funcionando de verdade — rodar, iniciar, abrir, testar no navegador, tirar screenshot, percorrer um fluxo ponta a ponta, reproduzir um bug que só aparece usando, ou confirmar que uma mudança funciona no app real e não só nos testes. Use também quando o pedido mencionar "abre o app", "vamos ver no navegador", "testa o fluxo de aprovação", "reproduz esse erro" ou qualquer verificação que exija clicar na interface.
---

# Rodar o VIU localmente

O VIU são dois repositórios (`viu-backend`, `viu-frontend`) mais um Postgres.
Este skill existe porque montar isso do zero tem meia dúzia de armadilhas que
custam tempo e mandam para o caminho errado — cada uma delas está documentada
abaixo com o motivo, não só o comando.

**Por que vale rodar de verdade:** a suíte pode estar 100% verde e o produto
não funcionar. Já aconteceu aqui — todo link compartilhado dava 404 (fetch de
servidor sem header `Origin`) e nenhum cliente conseguia comentar (condição
lendo um campo que nunca existiu). Nenhum teste pegaria; abrir o navegador
pegou em minutos.

## Caminho rápido

```bash
bash .claude/skills/rodar-viu/scripts/subir.sh
```

Sobe tudo e imprime as credenciais. Para derrubar:

```bash
bash .claude/skills/rodar-viu/scripts/derrubar.sh
```

Sobe em ~10 segundos quando as dependências já estão instaladas. Rodar de
novo é seguro: o que está de pé é reaproveitado e o banco não é semeado duas
vezes — é assim que se volta ao ar depois que o container reciclou tudo.

O `subir.sh` escreve `viu-backend/.env` e `viu-frontend/.env.local`, ambos com
uma linha de marca no topo; ele se recusa a sobrescrever um arquivo sem essa
marca, e o `derrubar.sh` só apaga os que a têm — um `.env` com credenciais de
verdade não se perde por acidente. Logs, PIDs e o cluster ficam em
`/tmp/viu-dev`. Dá para apontar para outro lugar com `VIU_BACKEND`,
`VIU_FRONTEND`, `PORTA_API`, `PORTA_APP`, `PGPORT` e `VIU_RUN_DIR`.

Leia o resto quando algo sair do esperado, ou quando precisar dirigir o
navegador.

## Contas do seed

Todas com senha `123456`:

| e-mail | papel |
|---|---|
| `designer@viu.com` | DESIGNER (Ana Silva) |
| `cliente1@empresa.com` | CLIENTE (João Santos) |
| `admin@viu.com` | ADMIN |

O seed cria projetos, artes, feedbacks e aprovações — mas **não cria links
compartilhados**. Para chegar ao viewer, crie um pela mesma rota que o
`ArteWizard` usa (ver "Dirigindo pelo navegador").

## Armadilhas, e por que existem

**`initdb` recusa rodar como root.** Em container quase sempre somos root.
Use `setpriv --reuid=postgres --regid=postgres --clear-groups` e dê `chown`
no diretório antes. O `subir.sh` já faz.

**O rate limit estoura navegando.** O backend limita 100 requisições por
15 minutos, e cada carga de página do dashboard faz várias. Duas ou três
navegações automatizadas derrubam tudo com 429, o que parece bug do app e não
é. Por isso o `.env` local leva `RATE_LIMIT_MAX` alto — é config de teste, não
mudança de produto.

**`curl` sem `Origin` recebe 500, não 401.** O backend recusa qualquer
requisição sem header `Origin` (guarda de CSRF). Ao testar por curl, mande
`-H "Origin: http://localhost:3000"`, senão o diagnóstico vai para o lado
errado. Um `401` significa que o servidor está de pé e funcionando.

**`pkill -f "padrão"` mata o próprio shell.** O padrão casa com a linha de
comando do bash que o executa, e o comando morre no meio (exit 144), deixando
o trabalho pela metade. Prefira `kill <pid>` obtido por `pgrep` num comando
separado.

**As imagens das artes vêm quebradas.** O seed aponta para caminhos que não
existem no R2, e as credenciais locais são fictícias. É esperado: o fluxo de
feedback e aprovação funciona sem a imagem carregar. Não vá atrás disso.

**O container recicla processos quando fica ocioso.** Depois de algumas horas
(ou de virar o dia), Postgres e servidores somem sem aviso. Se algo que
funcionava parar de responder, confira antes de investigar o código:

```bash
pgrep -f "next dev" ; pgrep -f "src/index.ts" ; pgrep -f postgres
```

Rodar o `subir.sh` de novo remonta só o que faltou.

## Dirigindo pelo navegador

Chromium e Playwright já estão instalados. **Não rode `playwright install`.**
O módulo fica fora do projeto:

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs'
```

Padrão que funciona bem — logar e reaproveitar a sessão:

```js
async function entrar(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', '123456')
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard|projetos/, { timeout: 25000 }).catch(() => {})
  return page
}
```

**Escute os erros da página**, senão eles passam batido:

```js
page.on('pageerror', e => console.log('[PAGEERROR]', e.message.slice(0, 2000)))
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()) })
page.on('response', r => { if (r.url().includes('/api/')) console.log(r.status(), r.url()) })
```

Para diagnosticar hidratação, imprima o trecho **do meio** da mensagem
(`e.message.slice(600, 2400)`): é onde o React mostra a árvore e o diff
`+servidor / -cliente`. O começo é só texto genérico.

**Sempre olhe o screenshot.** Um `page.screenshot()` que ninguém abre não
prova nada — tela em branco e error boundary passam despercebidos em
asserção de texto.

### Chegar ao viewer

O viewer precisa de um token de link, e o seed não cria nenhum. Criar pela
interface exigiria upload real ao R2. Use a mesma rota que o `ArteWizard`
chama, com a sessão do designer já aberta:

```js
const token = await page.evaluate(async () => {
  const artes = await fetch('http://localhost:3001/artes?limit=10', { credentials: 'include' })
    .then(r => r.json())
  const arte = artes.data[0]
  const link = await fetch('http://localhost:3001/links', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    // sem isto o link nasce somenteLeitura e o cliente não consegue comentar
    body: JSON.stringify({ arteId: arte.id, somenteLeitura: false }),
  }).then(r => r.json())
  return link.data.token
})
// depois: page.goto(`http://localhost:3000/l/${token}`)
```

Isso monta o estado pela API real e deixa a **interface** ser o que está sob
teste — que é o ponto de rodar no navegador.

## Loop de aprovação, ponta a ponta

O fluxo que vale a pena percorrer quando se mexe em aprovação:

1. Designer entra → `/projetos/{id}?tab=approval` → "Solicitar aprovação" →
   escolhe arte e versão → `POST /artes/:id/solicitar-aprovacao` devolve 201
2. Cliente entra → abre `/l/{token}` → aba "Aprovações" (só aparece com
   sessão) → "Aprovar" → `PATCH` devolve 200
3. O painel mostra "Aprovado" com o número da versão

Quem decide é sempre o aprovador da vez: o botão só aparece para ele, e o
backend recusa terceiros com 403.

## Verificação antes de commitar

Rodar no navegador não substitui a suíte:

```bash
npx tsc --noEmit ; echo "typecheck=$?"   # o exit code importa
npm test
npm run lint
npm run build
```

Cuidado com `npx tsc --noEmit | head -5 && echo "limpo"`: o `head` sai com 0
mesmo quando o `tsc` falha, e a mensagem mente. Cheque `$?` de verdade.

No **backend**, a suíte completa pode morrer com exit 137 (recurso) usando o
pool padrão do vitest. Não é o código:

```bash
npx vitest run --pool=forks --poolOptions.forks.singleFork=true tests/services tests/middleware
```

Migrations nunca com `db push` — o repo tem histórico versionado e um job de
CI que aplica do zero. Gere com `prisma migrate diff` e valide num banco
vazio.
