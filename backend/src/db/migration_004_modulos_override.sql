-- ============================================================
-- Migration 004 — Adiciona modulos_override em tenants
-- Permite admin liberar/bloquear módulos por tenant individualmente
-- Execute: docker exec -i zullya-postgres psql -U zullya_erp_user -d zullya_erp
-- ============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS modulos_override JSONB DEFAULT NULL;

SELECT 'Migration 004 aplicada com sucesso.' AS resultado;
