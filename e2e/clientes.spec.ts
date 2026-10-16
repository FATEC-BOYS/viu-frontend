import { test, expect } from '@playwright/test'
const api = 'http://127.0.0.1:3101'
test('cadastro de cliente cabe no celular e fecha sem reabrir pela URL', async ({ page, context }) => {
  await context.request.post(`${api}/auth/login`, { data: { email: 'designer@teste.local', senha: 'teste' } })
  let salvo = false
  await page.route(`${api}/clientes`, async route => {
    if (route.request().method() === 'POST') { salvo = true; return route.fulfill({ json: { data: { id: 'cliente-1' } } }) }
    return route.fulfill({ json: { data: salvo ? [{ id: 'cliente-1', nome: 'Café Aurora', email: 'contato@aurora.com', vinculado: true, projetos: [] }] : [] } })
  })
  await page.goto('/clientes?novo=1')
  const modal = page.getByRole('dialog')
  await expect(modal).toHaveCount(1)
  await expect(page).toHaveURL(/\/clientes$/)
  await modal.getByLabel('Nome do cliente', { exact: true }).fill('Café Aurora')
  await modal.getByLabel('E-mail', { exact: true }).fill('contato@aurora.com')
  const box = await modal.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(844)
  await expect(modal.getByRole('button', { name: 'Salvar cliente' })).toBeInViewport()
  await page.screenshot({ path: '/tmp/viu-cliente-mobile.png' })
  await modal.getByRole('button', { name: 'Salvar cliente' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByText('Café Aurora', { exact: true })).toBeVisible()
  await expect(page.getByText('Nenhum cliente ainda')).toHaveCount(0)
  await page.reload()
  await expect(modal).toHaveCount(0)
})
