const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /api/bi — todos os dados analíticos em uma única resposta
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;

    const [tendencia, heatmap, porCanal, topClientes, ticketPorDia] = await Promise.all([

      // 1. Tendência — vendas dos últimos 30 dias agrupadas por dia
      query(
        `SELECT
           DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') AS data,
           COALESCE(SUM(total), 0)                          AS faturamento,
           COUNT(*)                                         AS pedidos
         FROM pedidos
         WHERE tenant_id = $1
           AND criado_em >= NOW() - INTERVAL '30 days'
           AND status NOT IN ('cancelado')
         GROUP BY 1
         ORDER BY 1`,
        [tenantId]
      ),

      // 2. Heatmap — pedidos por hora (0-23) e dia da semana (0=Dom … 6=Sab)
      query(
        `SELECT
           EXTRACT(hour FROM criado_em AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS hora,
           EXTRACT(dow  FROM criado_em AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS dia_semana,
           COUNT(*) AS pedidos
         FROM pedidos
         WHERE tenant_id = $1
           AND status NOT IN ('cancelado')
         GROUP BY 1, 2
         ORDER BY 1, 2`,
        [tenantId]
      ),

      // 3. Por canal — faturamento e pedidos agrupados por tipo
      query(
        `SELECT
           COALESCE(tipo, 'nao_informado') AS canal,
           COALESCE(SUM(total), 0)         AS faturamento,
           COUNT(*)                        AS pedidos
         FROM pedidos
         WHERE tenant_id = $1
           AND status NOT IN ('cancelado')
         GROUP BY 1
         ORDER BY faturamento DESC`,
        [tenantId]
      ),

      // 4. Top 5 clientes — últimos 30 dias por total gasto
      query(
        `SELECT
           p.cliente_id,
           c.nome                          AS cliente_nome,
           COALESCE(SUM(p.total), 0)       AS total_gasto,
           COUNT(p.id)                     AS pedidos
         FROM pedidos p
         LEFT JOIN clientes c ON c.id = p.cliente_id AND c.tenant_id = $1
         WHERE p.tenant_id = $1
           AND p.cliente_id IS NOT NULL
           AND p.criado_em >= NOW() - INTERVAL '30 days'
           AND p.status NOT IN ('cancelado')
         GROUP BY p.cliente_id, c.nome
         ORDER BY total_gasto DESC
         LIMIT 5`,
        [tenantId]
      ),

      // 5. Ticket médio por dia da semana (0=Dom … 6=Sab)
      query(
        `SELECT
           EXTRACT(dow FROM criado_em AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS dia_semana,
           ROUND(AVG(total)::NUMERIC, 2) AS ticket_medio,
           COUNT(*) AS pedidos
         FROM pedidos
         WHERE tenant_id = $1
           AND total > 0
           AND status NOT IN ('cancelado')
         GROUP BY 1
         ORDER BY 1`,
        [tenantId]
      ),
    ]);

    return res.json({
      sucesso: true,
      dados: {
        tendencia:      tendencia.rows,
        heatmap:        heatmap.rows,
        por_canal:      porCanal.rows,
        top_clientes:   topClientes.rows,
        ticket_por_dia: ticketPorDia.rows,
      },
    });
  } catch (err) {
    console.error('BI GET /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar dados de Business Intelligence.' });
  }
});

module.exports = router;
