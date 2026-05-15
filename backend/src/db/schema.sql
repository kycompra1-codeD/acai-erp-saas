-- ============================================================
-- Zullya ERP - Schema Multi-tenant PostgreSQL 16
-- ============================================================
-- Execute com: psql -U zullya_erp_user -d zullya_erp -f schema.sql
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PLANOS DE ASSINATURA
-- ============================================================
CREATE TABLE IF NOT EXISTS planos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,                -- Ex: "Starter", "Pro", "Enterprise"
    valor_mensal NUMERIC(10, 2) NOT NULL,
    valor_anual NUMERIC(10, 2),
    max_usuarios INTEGER NOT NULL DEFAULT 3,
    max_filiais INTEGER NOT NULL DEFAULT 1,
    max_produtos INTEGER NOT NULL DEFAULT 500,
    modulos JSONB NOT NULL DEFAULT '[]',       -- Ex: ["vendas","estoque","financeiro"]
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TENANTS (Empresas / Clientes do SaaS)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_empresa VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email_contato VARCHAR(255) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    plano_id UUID REFERENCES planos(id),
    status VARCHAR(30) NOT NULL DEFAULT 'trial'
        CHECK (status IN ('trial', 'ativo', 'suspenso', 'cancelado', 'inadimplente')),
    trial_expira_em TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    logo_url TEXT,
    configuracoes JSONB NOT NULL DEFAULT '{}', -- Configurações personalizadas por empresa
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSINATURAS (Controle financeiro dos planos)
-- ============================================================
CREATE TABLE IF NOT EXISTS assinaturas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plano_id UUID NOT NULL REFERENCES planos(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'ativa', 'cancelada', 'vencida', 'trial')),
    periodo VARCHAR(10) NOT NULL DEFAULT 'mensal'
        CHECK (periodo IN ('mensal', 'anual')),
    valor NUMERIC(10, 2) NOT NULL,
    gateway_payment_id VARCHAR(255),           -- ID da transação no RRPay
    gateway_subscription_id VARCHAR(255),     -- ID da assinatura recorrente no RRPay
    proximo_vencimento TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USUÁRIOS (Multi-tenant - cada usuário pertence a 1 empresa)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    nivel_permissao VARCHAR(30) NOT NULL DEFAULT 'operador'
        CHECK (nivel_permissao IN ('master', 'admin', 'gerente', 'vendedor', 'caixa', 'estoque', 'financeiro', 'operador')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    ultimo_acesso TIMESTAMPTZ,
    refresh_token_hash VARCHAR(255),           -- Para invalidar sessões
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, email)                   -- Email único POR empresa (não globalmente)
);

-- ============================================================
-- FILIAIS (Opcional - empresas com múltiplas unidades)
-- ============================================================
CREATE TABLE IF NOT EXISTS filiais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    endereco JSONB,
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOGS DE AUDITORIA (Para rastrear ações críticas)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL,                -- Ex: "LOGIN", "PRODUTO_CRIADO", "VENDA_EXCLUIDA"
    tabela_alvo VARCHAR(100),
    registro_id UUID,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip_address INET,
    user_agent TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WEBHOOK LOGS (Rastrear eventos do RRPay)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway VARCHAR(50) NOT NULL DEFAULT 'rrpay',
    evento VARCHAR(100) NOT NULL,              -- Ex: "payment.approved", "subscription.cancelled"
    payload JSONB NOT NULL,
    processado BOOLEAN NOT NULL DEFAULT false,
    erro TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_tenant ON usuarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_assinaturas_tenant ON assinaturas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_criado ON audit_logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_filiais_tenant ON filiais(tenant_id);

-- ============================================================
-- FUNÇÃO: Atualizar atualizado_em automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_atualizado_tenants
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

CREATE OR REPLACE TRIGGER set_atualizado_usuarios
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

CREATE OR REPLACE TRIGGER set_atualizado_assinaturas
    BEFORE UPDATE ON assinaturas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- DADOS INICIAIS: Planos padrão
-- ============================================================
INSERT INTO planos (nome, valor_mensal, valor_anual, max_usuarios, max_filiais, max_produtos, modulos) VALUES
(
    'Starter',
    97.00,
    970.00,
    3,
    1,
    500,
    '["vendas","estoque","clientes","relatorios_basicos"]'
),
(
    'Pro',
    197.00,
    1970.00,
    10,
    3,
    5000,
    '["vendas","estoque","clientes","financeiro","crm","nfe","relatorios","metas"]'
),
(
    'Enterprise',
    397.00,
    3970.00,
    999,
    999,
    999999,
    '["vendas","estoque","clientes","financeiro","crm","nfe","relatorios","metas","multi_filial","api_acesso","suporte_prioritario"]'
)
ON CONFLICT DO NOTHING;
