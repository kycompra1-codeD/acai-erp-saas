-- =============================================================
-- migrate-premium.sql
-- Zullya ERP — Migração de funcionalidades Premium
-- =============================================================

BEGIN;

-- =============================================================
-- 1. Colunas adicionais em categorias
-- =============================================================
ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- =============================================================
-- 2. Tabela oportunidades (CRM pipeline)
-- =============================================================
CREATE TABLE IF NOT EXISTS oportunidades (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id     UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  titulo         VARCHAR(255) NOT NULL,
  valor          NUMERIC(10,2) DEFAULT 0,
  etapa          VARCHAR(50) NOT NULL DEFAULT 'lead'
                   CHECK (etapa IN ('lead','contato','proposta','negociacao','fechado_ganho','fechado_perdido')),
  probabilidade  INTEGER DEFAULT 50
                   CHECK (probabilidade BETWEEN 0 AND 100),
  data_fechamento DATE,
  notas          TEXT,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_tenant_id  ON oportunidades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente_id ON oportunidades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa      ON oportunidades(etapa);

-- =============================================================
-- 3. Tabela notas_fiscais
-- =============================================================
CREATE TABLE IF NOT EXISTS notas_fiscais (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo          VARCHAR(10) NOT NULL DEFAULT 'NFC-e'
                  CHECK (tipo IN ('NF-e','NFC-e')),
  numero        INTEGER,
  serie         VARCHAR(10) DEFAULT '001',
  status        VARCHAR(20) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','autorizada','cancelada','rejeitada')),
  valor         NUMERIC(10,2) NOT NULL DEFAULT 0,
  cliente_nome  VARCHAR(255),
  cliente_id    UUID REFERENCES clientes(id) ON DELETE SET NULL,
  pedido_id     UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  protocolo     VARCHAR(100),
  motivo        TEXT,
  xml_url       TEXT,
  emitida_em    TIMESTAMPTZ DEFAULT NOW(),
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tenant_id  ON notas_fiscais(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cliente_id ON notas_fiscais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_pedido_id  ON notas_fiscais(pedido_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_status     ON notas_fiscais(status);

-- =============================================================
-- 4. Tabela regras_automacao
-- =============================================================
CREATE TABLE IF NOT EXISTS regras_automacao (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome             VARCHAR(255) NOT NULL,
  ativa            BOOLEAN     NOT NULL DEFAULT true,
  gatilho          VARCHAR(100) NOT NULL,
  condicoes        JSONB       DEFAULT '[]',
  acoes            JSONB       DEFAULT '[]',
  execucoes        INTEGER     DEFAULT 0,
  ultima_execucao  TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regras_automacao_tenant_id ON regras_automacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regras_automacao_ativa     ON regras_automacao(ativa);

-- =============================================================
-- 5. Tabela resgates_pontos
-- =============================================================
CREATE TABLE IF NOT EXISTS resgates_pontos (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_id      UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  pontos          INTEGER     NOT NULL,
  valor_resgatado NUMERIC(10,2) DEFAULT 0,
  motivo          VARCHAR(255),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resgates_pontos_tenant_id  ON resgates_pontos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resgates_pontos_cliente_id ON resgates_pontos(cliente_id);

-- =============================================================
-- 6. Trigger set_atualizado_em (cria função se não existir)
-- =============================================================
CREATE OR REPLACE FUNCTION fn_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para oportunidades
DROP TRIGGER IF EXISTS trg_oportunidades_atualizado_em ON oportunidades;
CREATE TRIGGER trg_oportunidades_atualizado_em
  BEFORE UPDATE ON oportunidades
  FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

-- Trigger para regras_automacao
DROP TRIGGER IF EXISTS trg_regras_automacao_atualizado_em ON regras_automacao;
CREATE TRIGGER trg_regras_automacao_atualizado_em
  BEFORE UPDATE ON regras_automacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_atualizado_em();

COMMIT;
