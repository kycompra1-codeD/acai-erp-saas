-- ============================================================
-- Migration 003 — Corrige módulos dos planos + adiciona novos
-- Execute: docker exec -i zullya-postgres psql -U zullya_erp_user -d zullya_erp
-- ============================================================

-- Starter: remove relatorios_basicos (não existe na nova lista), adiciona financeiro e compras
UPDATE planos
SET modulos = '["vendas","estoque","clientes","financeiro","compras"]'
WHERE nome = 'Starter';

-- Pro: inclui todos os módulos operacionais
UPDATE planos
SET modulos = '["vendas","estoque","clientes","financeiro","crm","nfe","relatorios","metas","compras","logistica","funcionarios","fidelidade"]'
WHERE nome ILIKE '%pro%';

-- Enterprise: inclui tudo
UPDATE planos
SET modulos = '["vendas","estoque","clientes","financeiro","crm","nfe","relatorios","metas","multi_filial","api_acesso","suporte_prioritario","automacoes","logistica","compras","funcionarios","fidelidade"]'
WHERE nome ILIKE '%enterprise%' OR nome ILIKE '%empresarial%';

SELECT nome, modulos FROM planos ORDER BY valor_mensal;

SELECT 'Migration 003 aplicada com sucesso.' AS resultado;
