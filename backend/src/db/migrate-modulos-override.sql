-- Adiciona override de módulos por tenant (permite customizar módulos além do plano)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS modulos_override JSONB;
