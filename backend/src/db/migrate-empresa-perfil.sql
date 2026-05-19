-- Adiciona campos de perfil completo da empresa ao tenant
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS razao_social        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS inscricao_estadual  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS regime_tributario   VARCHAR(50) DEFAULT 'Simples Nacional',
  ADD COLUMN IF NOT EXISTS email_comercial     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cep                 VARCHAR(10),
  ADD COLUMN IF NOT EXISTS logradouro          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS numero              VARCHAR(20),
  ADD COLUMN IF NOT EXISTS complemento         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bairro              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cidade              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS estado              CHAR(2);
