# Corrigir Erro de Sincronização na Tabela usuarios (Supabase)

## 🔴 Problema

O backend (Prisma) sincroniza com sucesso, mas a tabela `usuarios` do Supabase não cria o registro.

**Sintomas**:
- ✅ Backend (Prisma): Funciona
- ❌ Tabela usuarios: `null`
- Resultado: `"supabaseSync": false`

---

## 🔍 Causa

O problema é causado por **RLS (Row Level Security)** no Supabase bloqueando o insert/update na tabela `usuarios`.

Mesmo usando `SUPABASE_SERVICE_ROLE_KEY`, a tabela pode ter policies que impedem operações.

---

## ✅ Solução Rápida

### Opção 1: Desabilitar RLS (Desenvolvimento)

**⚠️ Apenas para desenvolvimento! NÃO use em produção sem policies adequadas**

1. Acesse o Dashboard do Supabase
2. Vá em **Database** → **Tables** → `usuarios`
3. Clique na aba **RLS (Row Level Security)**
4. Desative **"Enable RLS"**

### Opção 2: Criar Policy Correta (Produção)

1. Acesse o Dashboard do Supabase
2. Vá em **Database** → **Tables** → `usuarios`
3. Clique na aba **RLS (Row Level Security)**
4. Certifique-se de que **"Enable RLS"** está ativo
5. Adicione a seguinte policy:

#### Policy: "Service role can do everything"

```sql
-- Name: Service role can do everything
-- Operation: ALL
-- Using expression:
true

-- With check:
true
```

**OU** uma policy mais específica:

#### Policy: "Users can insert and update themselves"

```sql
-- Name: Users can insert their own data
-- Operation: INSERT
-- Using expression:
auth.uid() = id

-- Name: Users can update their own data
-- Operation: UPDATE
-- Using expression:
auth.uid() = id

-- Name: Users can read their own data
-- Operation: SELECT
-- Using expression:
auth.uid() = id
```

---

## 🧪 Verificar se Funcionou

### Método 1: Via SQL

Execute no **SQL Editor** do Supabase:

```sql
-- Verificar se tabela usuarios existe
SELECT * FROM usuarios LIMIT 5;

-- Verificar RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'usuarios';

-- Verificar policies
SELECT * FROM pg_policies WHERE tablename = 'usuarios';
```

### Método 2: Via Debug Page

1. Acesse `/debug-sync` no seu app
2. Clique em **"Sincronizar com Backend"**
3. Veja se `"supabaseSync": true`

---

## 🔧 SQL para Criar Tabela (se não existir)

Se a tabela `usuarios` não existe, crie com:

```sql
-- Criar tabela usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  avatar TEXT,
  tipo TEXT NOT NULL DEFAULT 'DESIGNER',
  ativo BOOLEAN NOT NULL DEFAULT true,
  "criadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "atualizadoEm" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ler seus próprios dados
CREATE POLICY "Users can read own data"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id);

-- Policy: Usuários podem inserir seus próprios dados
CREATE POLICY "Users can insert own data"
ON public.usuarios
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own data"
ON public.usuarios
FOR UPDATE
USING (auth.uid() = id);

-- Policy: Service role pode fazer tudo (IMPORTANTE!)
CREATE POLICY "Service role bypass"
ON public.usuarios
FOR ALL
USING (auth.role() = 'service_role');

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON public.usuarios(tipo);

-- Trigger para atualizar atualizadoEm
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."atualizadoEm" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## 🚨 Troubleshooting

### Erro: "relation usuarios does not exist"

**Causa**: A tabela `usuarios` não foi criada.

**Solução**: Execute o SQL acima para criar a tabela.

### Erro: "new row violates row-level security policy"

**Causa**: RLS está bloqueando o insert/update.

**Solução**: Adicione a policy "Service role bypass".

### Erro: "duplicate key value violates unique constraint"

**Causa**: Já existe um usuário com esse `id` ou `email`.

**Solução**: Isso é normal se o usuário já existe. O upsert deveria funcionar.

### supabaseSync ainda é false mesmo com policies

**Possíveis causas**:
1. Service role key incorreta
2. Service role key não foi configurada
3. Usando anon key em vez de service role key

**Verificar**:
```bash
# No terminal
echo $SUPABASE_SERVICE_ROLE_KEY

# Deve começar com "eyJh..." e ser diferente da ANON_KEY
```

---

## 📋 Checklist Final

- [ ] Tabela `usuarios` existe no Supabase
- [ ] RLS está habilitado na tabela
- [ ] Policy "Service role bypass" foi criada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada
- [ ] Service role key é diferente da anon key
- [ ] Testou via `/debug-sync`
- [ ] `supabaseSync: true` no resultado

---

## 🎯 Resultado Esperado

Após aplicar a solução:

```json
{
  "success": true,
  "supabaseSync": true,    // ✅ Agora true
  "backendSync": true,      // ✅ Já estava true
  "data": { ... }
}
```

E na página `/debug-sync`:
- ✅ Supabase Auth
- ✅ Tabela usuarios  ← Agora verde!
- ✅ Backend (Prisma)
- ✅ AuthContext Profile

---

**Precisa de ajuda?** Compartilhe o erro específico que aparece no console ou no resultado da sincronização.
