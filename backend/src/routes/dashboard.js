const express = require('express');
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/dashboard — KPIs principais
router.get('/', async (req, res) => {
  const tenant = req.usuario.tenant_id;
  try {
    const [vendasHoje, pedidosHoje, pedidosPendentes, ticketMedio, topProdutos, vendasSemana, estoqueAlertas, clientesNovos] = await Promise.all([
      // Vendas e faturamento hoje
      query(
        `SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS quantidade
         FROM pedidos WHERE tenant_id=$1 AND status NOT IN ('cancelado')
         AND criado_em >= CURRENT_DATE`,
        [tenant]
      ),
      // Pedidos de hoje por status
      query(
        `SELECT status, COUNT(*) AS quantidade
         FROM pedidos WHERE tenant_id=$1 AND criado_em >= CURRENT_DATE
         GROUP BY status`,
        [tenant]
      ),
      // Pedidos pendentes/em preparo
      query(
        `SELECT COUNT(*) AS quantidade FROM pedidos
         WHERE tenant_id=$1 AND status IN ('pendente','preparando')`,
        [tenant]
      ),
      // Ticket médio dos últimos 30 dias
      query(
        `SELECT COALESCE(AVG(total), 0) AS ticket_medio
         FROM pedidos WHERE tenant_id=$1 AND status NOT IN ('cancelado')
         AND criado_em >= NOW() - interval '30 days'`,
        [tenant]
      ),
      // Top 5 produtos mais vendidos hoje
      query(
        `SELECT ip.nome_produto, SUM(ip.quantidade) AS total_vendido, SUM(ip.subtotal) AS total_receita
         FROM itens_pedido ip
         JOIN pedidos p ON p.id = ip.pedido_id
         WHERE p.tenant_id=$1 AND p.status NOT IN ('cancelado') AND p.criado_em >= CURRENT_DATE
         GROUP BY ip.nome_produto ORDER BY total_vendido DESC LIMIT 5`,
        [tenant]
      ),
      // Vendas dos últimos 7 dias (para gráfico)
      query(
        `SELECT DATE(criado_em) AS dia,
                COALESCE(SUM(total), 0) AS total,
                COUNT(*) AS pedidos
         FROM pedidos WHERE tenant_id=$1 AND status NOT IN ('cancelado')
         AND criado_em >= CURRENT_DATE - interval '6 days'
         GROUP BY DATE(criado_em) ORDER BY dia`,
        [tenant]
      ),
      // Alertas de estoque crítico
      query(
        `SELECT COUNT(*) AS criticos
         FROM insumos WHERE tenant_id=$1 AND quantidade_atual <= quantidade_minima`,
        [tenant]
      ),
      // Clientes novos hoje
      query(
        `SELECT COUNT(*) AS quantidade FROM clientes WHERE tenant_id=$1 AND criado_em >= CURRENT_DATE`,
        [tenant]
      ),
    ]);

    res.json({
      sucesso: true,
      dados: {
        vendas_hoje: {
          total: parseFloat(vendasHoje.rows[0].total),
          quantidade: parseInt(vendasHoje.rows[0].quantidade),
        },
        pedidos_por_status: pedidosHoje.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.quantidade); return acc; }, {}),
        pedidos_pendentes: parseInt(pedidosPendentes.rows[0].quantidade),
        ticket_medio: parseFloat(ticketMedio.rows[0].ticket_medio),
        top_produtos: topProdutos.rows,
        vendas_semana: vendasSemana.rows,
        alertas_estoque: parseInt(estoqueAlertas.rows[0].criticos),
        clientes_novos_hoje: parseInt(clientesNovos.rows[0].quantidade),
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar dashboard.' }); }
});

// GET /api/dashboard/resumo-mes — resumo do mês atual
router.get('/resumo-mes', async (req, res) => {
  const tenant = req.usuario.tenant_id;
  try {
    const { rows: vendas } = await query(
      `SELECT
        COALESCE(SUM(total) FILTER (WHERE status NOT IN ('cancelado')), 0) AS faturamento,
        COUNT(*) FILTER (WHERE status NOT IN ('cancelado')) AS pedidos_concluidos,
        COUNT(*) FILTER (WHERE status = 'cancelado') AS pedidos_cancelados
       FROM pedidos WHERE tenant_id=$1
       AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenant]
    );

    const { rows: financeiro } = await query(
      `SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo='receita' AND status='pago'), 0) AS receitas,
        COALESCE(SUM(valor) FILTER (WHERE tipo='despesa' AND status='pago'), 0) AS despesas
       FROM lancamentos_financeiros WHERE tenant_id=$1
       AND DATE_TRUNC('month', criado_em) = DATE_TRUNC('month', CURRENT_DATE)`,
      [tenant]
    );

    const fin = financeiro[0];
    res.json({
      sucesso: true,
      dados: {
        ...vendas[0],
        receitas: parseFloat(fin.receitas),
        despesas: parseFloat(fin.despesas),
        lucro: parseFloat(fin.receitas) - parseFloat(fin.despesas),
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao carregar resumo do mês.' }); }
});

module.exports = router;
