-- ============================================================
-- Migration 001 — Google OAuth + Admin Panel + Trial Controls
-- Executar na VPS: psql -U zullya_erp_user -d zullya_erp -f migration_001_google_admin.sql
-- ============================================================

-- 1. Colunas faltando em usuarios (referenciadas no código mas não no schema)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_senha_token_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_senha_expiry      TIMESTAMPTZ;

-- 2. Google OAuth
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- senha_hash pode ser nula para usuários que entram apenas pelo Google
ALTER TABLE usuarios
  ALTER COLUMN senha_hash DROP NOT NULL;

-- 3. Campos admin nos tenants (gestão pelo dono da plataforma)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5,2)  NOT NULL DEFAULT 0
      CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100),
  ADD COLUMN IF NOT EXISTS acesso_gratuito     BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notas_internas      TEXT,
  ADD COLUMN IF NOT EXISTS bloqueado_em        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_bloqueio     TEXT;

-- 4. Tabela de administradores da plataforma (você, o dono)
CREATE TABLE IF NOT EXISTS admins (
  id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  senha_hash   VARCHAR(255) NOT NULL,
  ativo        BOOLEAN      NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ,
  criado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Admin padrão inicial (senha: ZullyaAdmin@2026 — TROQUE APÓS O PRIMEIRO LOGIN)
INSERT INTO admins (nome, email, senha_hash) VALUES (
  'Admin Zullya',
  'admin@zullya.com.br',
  -- bcrypt hash de "ZullyaAdmin@2026" com 12 rounds
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewWBNNpUbY4Jk8Oy'
) ON CONFLICT (email) DO NOTHING;

-- 5. Índice para busca por google_id
CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);
