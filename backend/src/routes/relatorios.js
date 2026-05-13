const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(checkPermissao(['master','admin','gerente']));

function validarDatas(req, res) {
  const { data_inicio, data_fim } = req.query;
  if (!data_inicio || !data_fim) {
    res.status(400).json({ sucesso: false, mensagem: 'data_inicio e data_fim são obrigatórios.' });
    return false;
  }
  return true;
}

// GET /api/relatorios/vendas — vendas por período com agrupamento diário
router.get('/vendas', async (req, res) => {
  if (!validarDatas(req, res)) return;
  const { data_inicio, data_fim, agrupar = 'dia' } = req.query;
  const tenant = req.usuario.tenant_id;

  const truncMap = { dia: 'day', semana: 'week', mes: 'month' };
  const trunc = truncMap[agrupar] || 'day';

  try {
    const { rows: porPeriodo } = await query(
      `SELECT
        DATE_TRUNC($1, criado_em) AS periodo,
        COUNT(*) AS pedidos,
        COALESCE(SUM(total), 0) AS faturamento,
        COALESCE(AVG(total), 0) AS ticket_medio
       FROM pedidos WHERE tenant_id=$2 AND status NOT IN ('cancelado')
       AND criado_em BETWEEN $3 AND $4::date + interval '1 day'
       GROUP BY periodo ORDER BY periodo`,
      [trunc, tenant, data_inicio, data_fim]
    );

    const { rows: porTipo } = await query(
      `SELECT tipo, COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS total
       FROM pedidos WHERE tenant_id=$1 AND status NOT IN ('cancelado')
       AND criado_em BETWEEN $2 AND $3::date + interval '1 day'
       GROUP BY tipo`,
      [tenant, data_inicio, data_fim]
    );

    const { rows: totais } = await query(
      `SELECT
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(total), 0) AS faturamento_total,
        COALESCE(AVG(total), 0) AS ticket_medio,
        COUNT(*) FILTER (WHERE status='cancelado') AS cancelados
       FROM pedidos WHERE tenant_id=$1
       AND criado_em BETWEEN $2 AND $3::date + interval '1 day'`,
      [tenant, data_inicio, data_fim]
    );

    res.json({ sucesso: true, dados: { por_periodo: porPeriodo, por_tipo: porTipo, resumo: totais[0] } });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório de vendas.' }); }
});

// GET /api/relatorios/produtos — ranking de produtos mais vendidos
router.get('/produtos', async (req, res) => {
  if (!validarDatas(req, res)) return;
  const { data_inicio, data_fim, limit = 20 } = req.query;
  const tenant = req.usuario.tenant_id;

  try {
    const { rows } = await query(
      `SELECT
        ip.nome_produto,
        ip.produto_id,
        SUM(ip.quantidade) AS quantidade_vendida,
        SUM(ip.subtotal) AS receita_total,
        AVG(ip.preco_unitario) AS preco_medio,
        COUNT(DISTINCT ip.pedido_id) AS num_pedidos
       FROM itens_pedido ip
       JOIN pedidos p ON p.id = ip.pedido_id
       WHERE p.tenant_id=$1 AND p.status NOT IN ('cancelado')
       AND p.criado_em BETWEEN $2 AND $3::date + interval '1 day'
       GROUP BY ip.nome_produto, ip.produto_id
       ORDER BY quantidade_vendida DESC LIMIT $4`,
      [tenant, data_inicio, data_fim, limit]
    );
    res.json({ sucesso: true, dados: rows });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório de produtos.' }); }
});

// GET /api/relatorios/clientes — clientes mais ativos
router.get('/clientes', async (req, res) => {
  if (!validarDatas(req, res)) return;
  const { data_inicio, data_fim, limit = 20 } = req.query;
  const tenant = req.usuario.tenant_id;

  try {
    const { rows } = await query(
      `SELECT
        COALESCE(c.nome, p.nome_cliente, 'Não identificado') AS cliente,
        p.cliente_id,
        COUNT(*) AS total_pedidos,
        COALESCE(SUM(p.total), 0) AS total_gasto,
        COALESCE(AVG(p.total), 0) AS ticket_medio
       FROM pedidos p
       LEFT JOIN clientes c ON c.id = p.cliente_id
       WHERE p.tenant_id=$1 AND p.status NOT IN ('cancelado')
       AND p.criado_em BETWEEN $2 AND $3::date + interval '1 day'
       GROUP BY c.nome, p.nome_cliente, p.cliente_id
       ORDER BY total_gasto DESC LIMIT $4`,
      [tenant, data_inicio, data_fim, limit]
    );
    res.json({ sucesso: true, dados: rows });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório de clientes.' }); }
});

// GET /api/relatorios/financeiro — fluxo de caixa por período
router.get('/financeiro', async (req, res) => {
  if (!validarDatas(req, res)) return;
  const { data_inicio, data_fim } = req.query;
  const tenant = req.usuario.tenant_id;

  try {
    const { rows: fluxo } = await query(
      `SELECT
        data,
        tipo,
        SUM(valor) AS total
       FROM lancamentos_financeiros WHERE tenant_id=$1 AND status='pago'
       AND data BETWEEN $2 AND $3
       GROUP BY data, tipo ORDER BY data`,
      [tenant, data_inicio, data_fim]
    );

    const { rows: porCategoria } = await query(
      `SELECT categoria, tipo, SUM(valor) AS total
       FROM lancamentos_financeiros WHERE tenant_id=$1 AND status='pago'
       AND data BETWEEN $2 AND $3
       GROUP BY categoria, tipo ORDER BY tipo, total DESC`,
      [tenant, data_inicio, data_fim]
    );

    res.json({ sucesso: true, dados: { fluxo, por_categoria: porCategoria } });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório financeiro.' }); }
});

// GET /api/relatorios/estoque — posição atual do estoque de insumos
router.get('/estoque', async (req, res) => {
  const tenant = req.usuario.tenant_id;
  try {
    const { rows } = await query(
      `SELECT i.*,
        i.quantidade_atual * i.custo_unitario AS valor_estoque,
        CASE
          WHEN i.quantidade_atual <= i.quantidade_minima THEN 'critico'
          WHEN i.quantidade_atual <= i.quantidade_minima * 1.5 THEN 'alerta'
          ELSE 'ok'
        END AS status_estoque
       FROM insumos i WHERE i.tenant_id=$1 ORDER BY i.nome`,
      [tenant]
    );

    const valorTotal = rows.reduce((acc, r) => acc + parseFloat(r.valor_estoque || 0), 0);
    res.json({ sucesso: true, dados: rows, valor_total_estoque: valorTotal });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório de estoque.' }); }
});

// GET /api/relatorios/funcionarios — folha de pagamento
router.get('/funcionarios', async (req, res) => {
  const tenant = req.usuario.tenant_id;
  try {
    const { rows } = await query(
      `SELECT nome, cargo, funcao, turno, salario, status, data_admissao
       FROM funcionarios WHERE tenant_id=$1 ORDER BY status, nome`,
      [tenant]
    );
    const folha = rows.filter(f => f.status === 'ativo').reduce((acc, f) => acc + parseFloat(f.salario || 0), 0);
    res.json({ sucesso: true, dados: rows, folha_total: folha });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar relatório de funcionários.' }); }
});

module.exports = router;
