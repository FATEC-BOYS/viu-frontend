# Guia: Sincronização em Produção

Este guia explica como a sincronização funciona em produção e como testá-la com segurança.

## 🚀 Como Funciona em Produção

### Sincronização Automática

A partir de agora, **todo login sincroniza automaticamente** os dados do usuário:

1. **Usuário faz login** (email/senha ou Google OAuth)
2. **Frontend autentica** no Supabase Auth
3. **Cria/atualiza** registro na tabela `usuarios` (Supabase)
4. **Sincroniza** com backend (Prisma/Railway)
5. **Salva** `prismaUserId` no localStorage

### Onde Acontece

- `contexts/AuthContext.tsx` - Sincronização automática em todos os logins
- `app/(auth)/callback/page.tsx` - Sincronização após OAuth
- `app/(auth)/login/page.tsx` - Sincronização após login email/senha

## 📋 Variáveis de Ambiente Necessárias

### Vercel

Configure estas variáveis no dashboard do Vercel:

```env
# Supabase (obrigatório)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_publica
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key

# OpenAI (obrigatório para TTS/transcrição)
OPENAI_API_KEY=sk-proj-...

# Debug Access (opcional - para acessar /debug-sync em produção)
ADMIN_EMAILS=seu@email.com,outro@email.com
```

**Como adicionar no Vercel**:
1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto
3. Settings → Environment Variables
4. Adicione cada variável
5. Selecione Production, Preview e Development
6. Save e faça Redeploy

## 🧪 Como Testar em Produção

### Método 1: Login Normal (Recomendado)

1. Acesse sua aplicação em produção
2. Faça **logout** se estiver logado
3. Faça **login novamente**
4. Abra DevTools (F12) → Console
5. Procure por logs:
   - 🔄 = Iniciando sincronização
   - ✅ = Sucesso
   - ❌ = Erro

### Método 2: Página de Debug (Apenas Admins)

1. Configure `ADMIN_EMAILS` no Vercel com seu email
2. Faça Redeploy
3. Acesse: `https://seu-app.vercel.app/debug-sync`
4. Clique em "🔄 Sincronizar com Backend"
5. Veja o resultado na tela

**Importante**: Sem `ADMIN_EMAILS`, você verá "🔒 Acesso Negado" em produção.

### Método 3: Via API (Técnico)

```bash
# Obter seu userId do localStorage
console.log(localStorage.getItem('supabase.auth.token'))

# Testar sincronização via API
fetch('/api/sync-current-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'SEU_USER_ID' })
})
.then(r => r.json())
.then(console.log)
```

## ✅ Verificando se Funcionou

### 1. Verificar no Supabase

Dashboard do Supabase → Table Editor → `usuarios`

Deve haver um registro com:
- `id` = UUID do Supabase Auth
- `email` = seu email
- `nome` = nome extraído do email/OAuth
- `tipo` = DESIGNER ou CLIENTE
- `ativo` = true

### 2. Verificar no Backend (Railway)

```bash
# No console do navegador
localStorage.getItem('prismaUserId')
```

Se retornar um ID (ex: `c1a2b3c4...`), significa que sincronizou!

### 3. Verificar Logs

No console do navegador (F12), procure por:

```
🔄 Iniciando sincronização com backend...
📡 Resposta HTTP: { status: 200, ok: true }
✅ Usuário sincronizado com backend!
```

## 🐛 Problemas Comuns

### Erro: "Backend (Prisma)" mostra ❌

**Possíveis causas**:
1. Backend offline no Railway
2. CORS bloqueando requisição
3. Variáveis de ambiente faltando no backend
4. Erro no schema do Prisma

**Solução**:
```bash
# Verificar se backend está online
curl https://viu-backend-production.up.railway.app/health

# Ver logs no Railway
railway logs --tail
```

### Erro: "Tabela usuarios" mostra ❌

**Possíveis causas**:
1. RLS (Row Level Security) bloqueando
2. Permissões insuficientes
3. Schema desatualizado

**Solução**:
Verifique as policies RLS no Supabase Dashboard → Authentication → Policies

### Erro: "ADMIN_EMAILS não funciona"

**Solução**:
1. Verifique se a variável foi adicionada no Vercel
2. Verifique se fez Redeploy após adicionar
3. Email deve estar exatamente como está no Supabase Auth (case-sensitive)

## 🔒 Segurança

### Página de Debug

- ✅ Em **desenvolvimento**: Aberta para todos (localhost)
- 🔒 Em **produção**: Apenas emails em `ADMIN_EMAILS`

### Recomendações

1. **Nunca** adicione a página `/debug-sync` em menus públicos
2. **Sempre** configure `ADMIN_EMAILS` em produção
3. **Remova** acesso de debug quando não precisar mais:
   ```bash
   # No Vercel, remova a variável ADMIN_EMAILS
   ```

## 📊 Monitoramento

### Logs Importantes

```javascript
// Ver todas as sincronizações
console.log(localStorage.getItem('prismaUserId'))

// Ver dados do Supabase
console.log(await supabase.auth.getUser())

// Testar sincronização manual
fetch('/api/sync-current-user', {
  method: 'POST',
  body: JSON.stringify({ userId: 'xxx' })
})
```

## 🚨 Em Caso de Emergência

Se usuários não estão sendo sincronizados:

1. **Verifique variáveis de ambiente** no Vercel
2. **Verifique backend** no Railway (`railway logs`)
3. **Sincronize manualmente** via `/debug-sync`
4. **Revert o deploy** se necessário

## 📞 Suporte

Se nada funcionar:

1. Abra DevTools (F12)
2. Vá em Console
3. Copie todos os logs de sincronização
4. Abra uma issue com os logs

---

**Versão**: 1.0
**Última atualização**: 2026-02-03
