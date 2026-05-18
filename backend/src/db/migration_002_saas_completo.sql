-- ============================================================
-- Migration 002 — SaaS Completo: planos, MP, trial, lembretes
-- Execute: docker exec -i zullya-postgres psql -U zullya_erp_user -d zullya_erp
-- ============================================================

-- Campos extras na tabela planos
ALTER TABLE planos
  ADD COLUMN IF NOT EXISTS descricao    TEXT,
  ADD COLUMN IF NOT EXISTS trial_dias   INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS destaque     BOOLEAN NOT NULL DEFAULT false;

-- Status 'expirado' para tenants cujo trial venceu sem assinar
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE tenants
  ADD CONSTRAINT tenants_status_check
    CHECK (status IN ('trial','ativo','suspenso','cancelado','inadimplente','expirado'));

-- Colunas Mercado Pago nas assinaturas
ALTER TABLE assinaturas
  ADD COLUMN IF NOT EXISTS mp_preference_id   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mp_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS mp_payment_id      VARCHAR(255);

-- Tabela de controle de lembretes de trial (evita reenvio)
CREATE TABLE IF NOT EXISTS trial_lembretes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo        VARCHAR(10) NOT NULL CHECK (tipo IN ('D-7','D-3','D-1','expirado')),
  enviado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, tipo)
);

-- Índice para o cron de expiração (query diária eficiente)
CREATE INDEX IF NOT EXISTS idx_tenants_trial_expira
  ON tenants(trial_expira_em)
  WHERE status = 'trial';

-- Atualizar os planos existentes com descricao e trial_dias (se já existirem)
UPDATE planos SET
  descricao  = 'Para quem está começando e busca profissionalizar as vendas.',
  trial_dias = 14,
  destaque   = false
WHERE nome = 'Starter' AND descricao IS NULL;

UPDATE planos SET
  descricao  = 'O ecossistema completo para gestão profissional e crescimento.',
  trial_dias = 14,
  destaque   = true
WHERE nome ILIKE '%pro%' AND descricao IS NULL;

-- Confirmar
SELECT 'Migration 002 aplicada com sucesso.' AS resultado;
