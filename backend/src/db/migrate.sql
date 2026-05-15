-- ============================================================
-- Zullya ERP - Migration: Schema Completo do ERP
-- ============================================================
-- Execute: psql -U zullya_erp_user -d zullya_erp -f migrate.sql
-- ============================================================

-- Colunas para redefinição de senha (adicionadas na v1.1)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_senha_token_hash VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_senha_expiry TIMESTAMPTZ;

-- ============================================================
-- CATEGORIAS DE PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) DEFAULT '📦',
    cor VARCHAR(20) DEFAULT '#8B5CF6',
    ativa BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categorias_tenant ON categorias(tenant_id);

-- ============================================================
-- FORNECEDORES
-- ============================================================
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    contato VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    categoria VARCHAR(100),
    avaliacao INTEGER DEFAULT 3 CHECK (avaliacao BETWEEN 1 AND 5),
    prazo_pagamento VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant ON fornecedores(tenant_id);

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    sku VARCHAR(100),
    ean VARCHAR(20),
    preco NUMERIC(10,2) NOT NULL DEFAULT 0,
    custo NUMERIC(10,2) DEFAULT 0,
    emoji VARCHAR(10) DEFAULT '🍇',
    imagem_url TEXT,
    identity_type VARCHAR(10) DEFAULT 'emoji',
    unidade VARCHAR(20) DEFAULT 'unid',
    peso NUMERIC(10,3),
    estoque_atual NUMERIC(10,3) DEFAULT 0,
    estoque_minimo NUMERIC(10,3) DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    -- Campos fiscais
    ncm VARCHAR(10),
    cest VARCHAR(10),
    cfop VARCHAR(10),
    icms NUMERIC(5,2) DEFAULT 0,
    pis NUMERIC(5,2) DEFAULT 0,
    cofins NUMERIC(5,2) DEFAULT 0,
    observacoes_internas TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE TRIGGER set_atualizado_produtos
    BEFORE UPDATE ON produtos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

CREATE OR REPLACE TRIGGER set_atualizado_fornecedores
    BEFORE UPDATE ON fornecedores
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- PRODUTO x FORNECEDOR (N:N)
-- ============================================================
CREATE TABLE IF NOT EXISTS produto_fornecedores (
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    PRIMARY KEY (produto_id, fornecedor_id)
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(20),
    email VARCHAR(255),
    telefone VARCHAR(20),
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    pontos INTEGER DEFAULT 0,
    desconto_fidelidade NUMERIC(5,2) DEFAULT 0,
    total_gasto NUMERIC(12,2) DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clientes_tenant ON clientes(tenant_id);

CREATE OR REPLACE TRIGGER set_atualizado_clientes
    BEFORE UPDATE ON clientes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- FUNCIONÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    cargo VARCHAR(100),
    funcao VARCHAR(50) DEFAULT 'operador',
    turno VARCHAR(20) DEFAULT 'integral',
    salario NUMERIC(10,2) DEFAULT 0,
    telefone VARCHAR(20),
    email VARCHAR(255),
    foto_url TEXT,
    cep VARCHAR(10),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','ferias','afastado')),
    data_admissao DATE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant ON funcionarios(tenant_id);

CREATE OR REPLACE TRIGGER set_atualizado_funcionarios
    BEFORE UPDATE ON funcionarios
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    nome_cliente VARCHAR(255),
    tipo VARCHAR(20) NOT NULL DEFAULT 'balcao' CHECK (tipo IN ('balcao','delivery','retirada')),
    status VARCHAR(30) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','preparando','pronto','entregue','cancelado')),
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    desconto NUMERIC(10,2) DEFAULT 0,
    taxa_entrega NUMERIC(10,2) DEFAULT 0,
    origem VARCHAR(50) DEFAULT 'balcao',
    observacoes TEXT,
    pendente_em TIMESTAMPTZ DEFAULT NOW(),
    preparando_em TIMESTAMPTZ,
    pronto_em TIMESTAMPTZ,
    entregue_em TIMESTAMPTZ,
    cancelado_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_criado ON pedidos(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);

CREATE OR REPLACE TRIGGER set_atualizado_pedidos
    BEFORE UPDATE ON pedidos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- Sequência por tenant (simulada via MAX + 1)
-- ============================================================
-- ITENS DE PEDIDO
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
    nome_produto VARCHAR(255) NOT NULL,
    quantidade NUMERIC(10,3) NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_itens_pedido ON itens_pedido(pedido_id);

-- ============================================================
-- PAGAMENTOS DE PEDIDO
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    metodo VARCHAR(30) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    troco NUMERIC(10,2) DEFAULT 0
);

-- ============================================================
-- INSUMOS (Estoque de ingredientes/matérias-primas)
-- ============================================================
CREATE TABLE IF NOT EXISTS insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    unidade VARCHAR(20) DEFAULT 'unid',
    quantidade_atual NUMERIC(10,3) DEFAULT 0,
    quantidade_minima NUMERIC(10,3) DEFAULT 0,
    custo NUMERIC(10,2) DEFAULT 0,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_insumos_tenant ON insumos(tenant_id);

CREATE OR REPLACE TRIGGER set_atualizado_insumos
    BEFORE UPDATE ON insumos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- MOVIMENTAÇÕES DE ESTOQUE
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','saida','acerto')),
    quantidade NUMERIC(10,3) NOT NULL,
    quantidade_anterior NUMERIC(10,3),
    quantidade_posterior NUMERIC(10,3),
    motivo VARCHAR(100),
    observacao TEXT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_insumo ON movimentacoes_estoque(insumo_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tenant ON movimentacoes_estoque(tenant_id);

-- ============================================================
-- ORDENS DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS compras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    numero VARCHAR(20) NOT NULL,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','recebida','cancelada')),
    total NUMERIC(10,2) DEFAULT 0,
    data_emissao DATE DEFAULT CURRENT_DATE,
    data_previsao DATE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_compras_tenant ON compras(tenant_id);

CREATE OR REPLACE TRIGGER set_atualizado_compras
    BEFORE UPDATE ON compras
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();

-- ============================================================
-- ITENS DE COMPRA
-- ============================================================
CREATE TABLE IF NOT EXISTS itens_compra (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    insumo_id UUID REFERENCES insumos(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    quantidade NUMERIC(10,3) NOT NULL,
    preco_unitario NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_itens_compra ON itens_compra(compra_id);

-- ============================================================
-- LANÇAMENTOS FINANCEIROS
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita','despesa')),
    categoria VARCHAR(100) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    metodo_pagamento VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','pendente','cancelado')),
    recorrente BOOLEAN DEFAULT false,
    pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tenant ON lancamentos_financeiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON lancamentos_financeiros(data DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON lancamentos_financeiros(tipo);

CREATE OR REPLACE TRIGGER set_atualizado_lancamentos
    BEFORE UPDATE ON lancamentos_financeiros
    FOR EACH ROW EXECUTE FUNCTION trigger_set_atualizado_em();
