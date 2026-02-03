-- ================================================
-- CRIAR TABELA usuario_auth
-- ================================================
-- Execute este script no Supabase SQL Editor
-- Dashboard > SQL Editor > New query > Cole e Execute
-- ================================================

-- Esta tabela vincula usuários do Supabase Auth com o sistema
-- Usa UUID do Supabase Auth como ID (diferente da tabela usuarios)

CREATE TABLE IF NOT EXISTS usuario_auth (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  avatar TEXT,
  tipo TEXT DEFAULT 'DESIGNER' NOT NULL,
  ativo BOOLEAN DEFAULT true NOT NULL,
  "criadoEm" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "atualizadoEm" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS "usuario_auth_email_idx" ON usuario_auth(email);
CREATE INDEX IF NOT EXISTS "usuario_auth_tipo_idx" ON usuario_auth(tipo);
CREATE INDEX IF NOT EXISTS "usuario_auth_ativo_idx" ON usuario_auth(ativo);

-- Habilitar RLS
ALTER TABLE usuario_auth ENABLE ROW LEVEL SECURITY;

-- Policy: Service role pode fazer tudo (necessário para sincronização)
CREATE POLICY IF NOT EXISTS "Service role bypass"
ON usuario_auth
FOR ALL
USING (auth.role() = 'service_role');

-- Policy: Usuários podem ler seus próprios dados
CREATE POLICY IF NOT EXISTS "Users can read own data"
ON usuario_auth
FOR SELECT
USING (auth.uid() = id);

-- Policy: Usuários podem atualizar seus próprios dados
CREATE POLICY IF NOT EXISTS "Users can update own data"
ON usuario_auth
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Trigger para atualizar atualizadoEm
CREATE OR REPLACE FUNCTION update_usuario_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."atualizadoEm" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usuario_auth_updated_at
BEFORE UPDATE ON usuario_auth
FOR EACH ROW
EXECUTE FUNCTION update_usuario_auth_updated_at();

-- ================================================
-- PRONTO!
-- ================================================
-- Agora teste a sincronização em /debug-sync
-- ================================================
