-- Campos adicionais de perfil fiscal e responsável da empresa
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cnae               VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ie_isento          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website            VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tipo_pessoa        VARCHAR(2) NOT NULL DEFAULT 'PJ',
  ADD COLUMN IF NOT EXISTS responsavel_nome   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsavel_email  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS responsavel_celular VARCHAR(20);
