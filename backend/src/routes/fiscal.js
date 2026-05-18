const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /api/fiscal — listar notas fiscais do tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { status, tipo, data_inicio, data_fim } = req.query;

    let sql = `
      SELECT
        nf.id, nf.tipo, nf.numero, nf.serie, nf.status, nf.valor,
        nf.cliente_nome, nf.cliente_id, nf.pedido_id,
        nf.protocolo, nf.motivo, nf.xml_url,
        nf.emitida_em, nf.criado_em,
        c.nome AS cliente_nome_cadastro
      FROM notas_fiscais nf
      LEFT JOIN clientes c ON c.id = nf.cliente_id AND c.tenant_id = $1
      WHERE nf.tenant_id = $1
    `;
    const params = [tenantId];

    if (status) {
      params.push(status);
      sql += ` AND nf.status = $${params.length}`;
    }
    if (tipo) {
      params.push(tipo);
      sql += ` AND nf.tipo = $${params.length}`;
    }
    if (data_inicio) {
      params.push(data_inicio);
      sql += ` AND nf.emitida_em >= $${params.length}`;
    }
    if (data_fim) {
      params.push(data_fim);
      sql += ` AND nf.emitida_em <= $${params.length}`;
    }

    sql += ' ORDER BY nf.emitida_em DESC';

    const resultado = await query(sql, params);
    return res.json({ sucesso: true, dados: resultado.rows });
  } catch (err) {
    console.error('FISCAL GET /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar notas fiscais.' });
  }
});

// GET /api/fiscal/resumo — contagem por status + soma + contagem por tipo
router.get('/resumo', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;

    const [porStatus, porTipo] = await Promise.all([
      query(
        `SELECT
           status,
           COUNT(*)                AS total,
           COALESCE(SUM(valor), 0) AS valor_total
         FROM notas_fiscais
         WHERE tenant_id = $1
         GROUP BY status
         ORDER BY status`,
        [tenantId]
      ),
      query(
        `SELECT
           tipo,
           COUNT(*)                AS total,
           COALESCE(SUM(valor), 0) AS valor_total
         FROM notas_fiscais
         WHERE tenant_id = $1
         GROUP BY tipo
         ORDER BY tipo`,
        [tenantId]
      ),
    ]);

    return res.json({
      sucesso: true,
      dados: {
        por_status: porStatus.rows,
        por_tipo: porTipo.rows,
      },
    });
  } catch (err) {
    console.error('FISCAL GET /resumo:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar resumo fiscal.' });
  }
});

// POST /api/fiscal — emitir nota fiscal (numero auto-incrementado por tenant)
router.post('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const {
      tipo = 'NFC-e',
      serie = '001',
      status = 'pendente',
      valor,
      cliente_nome = null,
      cliente_id = null,
      pedido_id = null,
      protocolo = null,
      xml_url = null,
    } = req.body;

    if (valor === undefined || valor === null) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "valor" é obrigatório.' });
    }

    // Gerar próximo número para o tenant+tipo+serie
    const maxResult = await query(
      `SELECT COALESCE(MAX(numero), 0) + 1 AS proximo
       FROM notas_fiscais
       WHERE tenant_id = $1 AND tipo = $2 AND serie = $3`,
      [tenantId, tipo, serie]
    );
    const numero = maxResult.rows[0].proximo;

    const resultado = await query(
      `INSERT INTO notas_fiscais
         (tenant_id, tipo, numero, serie, status, valor, cliente_nome, cliente_id, pedido_id, protocolo, xml_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [tenantId, tipo, numero, serie, status, valor, cliente_nome, cliente_id, pedido_id, protocolo, xml_url]
    );

    return res.status(201).json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('FISCAL POST /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao emitir nota fiscal.' });
  }
});

// PUT /api/fiscal/:id/cancelar — cancelar nota (somente se status = 'autorizada')
router.put('/:id/cancelar', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "motivo" é obrigatório para cancelamento.' });
    }

    const nota = await query(
      'SELECT id, status FROM notas_fiscais WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (nota.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Nota fiscal não encontrada.' });
    }

    if (nota.rows[0].status !== 'autorizada') {
      return res.status(422).json({
        sucesso: false,
        mensagem: `Nota fiscal não pode ser cancelada. Status atual: "${nota.rows[0].status}".`,
      });
    }

    const resultado = await query(
      `UPDATE notas_fiscais
       SET status = 'cancelada', motivo = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING *`,
      [motivo.trim(), id, tenantId]
    );

    return res.json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('FISCAL PUT /:id/cancelar:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar nota fiscal.' });
  }
});

module.exports = router;
