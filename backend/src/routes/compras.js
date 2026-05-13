const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(checkPermissao(['master','admin','gerente']));

// GET /api/compras
router.get('/', async (req, res) => {
  const { status, fornecedor_id, data_inicio, data_fim, limit = 50, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT c.*, f.nome AS fornecedor_nome,
        (SELECT json_agg(ic ORDER BY ic.id) FROM itens_compra ic WHERE ic.compra_id = c.id) AS itens
      FROM compras c
      LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE c.tenant_id = $1
    `;
    const params = [req.usuario.tenant_id];
    if (status) { params.push(status); sql += ` AND c.status = $${params.length}`; }
    if (fornecedor_id) { params.push(fornecedor_id); sql += ` AND c.fornecedor_id = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); sql += ` AND c.criado_em >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); sql += ` AND c.criado_em <= $${params.length}::date + interval '1 day'`; }
    sql += ` ORDER BY c.criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);
    const { rows: count } = await query(
      'SELECT COUNT(*) FROM compras WHERE tenant_id=$1' + (status ? ' AND status=$2' : ''),
      status ? [req.usuario.tenant_id, status] : [req.usuario.tenant_id]
    );
    res.json({ sucesso: true, dados: rows, total: parseInt(count[0].count) });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar compras.' }); }
});

// GET /api/compras/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT c.*, f.nome AS fornecedor_nome,
        (SELECT json_agg(ic ORDER BY ic.id) FROM itens_compra ic WHERE ic.compra_id=c.id) AS itens
       FROM compras c
       LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
       WHERE c.id=$1 AND c.tenant_id=$2`,
      [req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Compra não encontrada.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar compra.' }); }
});

// POST /api/compras
router.post('/', [
  body('fornecedor_id').notEmpty().withMessage('Fornecedor é obrigatório'),
  body('itens').isArray({ min: 1 }).withMessage('Deve ter ao menos 1 item'),
  body('itens.*.descricao').notEmpty(),
  body('itens.*.quantidade').isFloat({ min: 0.001 }),
  body('itens.*.preco_unitario').isFloat({ min: 0 }),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { fornecedor_id, itens, observacoes, data_previsao } = req.body;
  try {
    await withTransaction(async (client) => {
      // Número sequencial por tenant
      const { rows: numRows } = await client.query(
        "SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(numero,'[^0-9]','','g') AS INTEGER)),0)+1 AS proximo FROM compras WHERE tenant_id=$1",
        [req.usuario.tenant_id]
      );
      const numero = `OC-${String(numRows[0].proximo).padStart(4, '0')}`;

      const total = itens.reduce((acc, i) => acc + (parseFloat(i.quantidade) * parseFloat(i.preco_unitario)), 0);

      const { rows: compraRows } = await client.query(
        `INSERT INTO compras (tenant_id, numero, fornecedor_id, total, observacoes, data_previsao)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.usuario.tenant_id, numero, fornecedor_id, total, observacoes, data_previsao || null]
      );
      const compra = compraRows[0];

      for (const item of itens) {
        const subtotal = parseFloat(item.quantidade) * parseFloat(item.preco_unitario);
        await client.query(
          'INSERT INTO itens_compra (compra_id, insumo_id, descricao, quantidade, preco_unitario, subtotal) VALUES ($1,$2,$3,$4,$5,$6)',
          [compra.id, item.insumo_id || null, item.descricao, item.quantidade, item.preco_unitario, subtotal]
        );
      }

      res.status(201).json({ sucesso: true, dados: compra });
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar compra.' }); }
});

// PATCH /api/compras/:id/status — pipeline: pendente → aprovada → recebida / cancelada
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const statusValidos = ['pendente','aprovada','recebida','cancelada'];
  if (!statusValidos.includes(status)) return res.status(400).json({ sucesso: false, mensagem: 'Status inválido.' });

  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE compras SET status=$1, atualizado_em=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *`,
        [status, req.params.id, req.usuario.tenant_id]
      );
      if (!rows.length) { res.status(404).json({ sucesso: false, mensagem: 'Compra não encontrada.' }); return; }

      const compra = rows[0];

      // Ao receber: dar entrada no estoque e lançar despesa
      if (status === 'recebida') {
        const { rows: itens } = await client.query(
          'SELECT * FROM itens_compra WHERE compra_id=$1 AND insumo_id IS NOT NULL',
          [req.params.id]
        );
        for (const item of itens) {
          const { rows: insBefore } = await client.query(
            'SELECT quantidade_atual FROM insumos WHERE id=$1', [item.insumo_id]
          );
          const qtdAnterior = insBefore[0]?.quantidade_atual || 0;
          const qtdNova = parseFloat(qtdAnterior) + parseFloat(item.quantidade);

          await client.query(
            'UPDATE insumos SET quantidade_atual=$1, atualizado_em=NOW() WHERE id=$2 AND tenant_id=$3',
            [qtdNova, item.insumo_id, req.usuario.tenant_id]
          );
          await client.query(
            `INSERT INTO movimentacoes_estoque (tenant_id, insumo_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, usuario_id)
             VALUES ($1,$2,'entrada',$3,$4,$5,$6,$7)`,
            [req.usuario.tenant_id, item.insumo_id, item.quantidade, qtdAnterior, qtdNova, `Compra ${compra.numero}`, req.usuario.id]
          );
        }

        await client.query(
          `INSERT INTO lancamentos_financeiros (tenant_id, tipo, categoria, descricao, valor, status)
           VALUES ($1,'despesa','Compras',$2,$3,'pago')`,
          [req.usuario.tenant_id, `Compra de insumos ${compra.numero}`, compra.total]
        );
      }

      res.json({ sucesso: true, dados: compra });
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar status.' }); }
});

// DELETE /api/compras/:id — cancelar (apenas pendente ou aprovada)
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      "UPDATE compras SET status='cancelada', atualizado_em=NOW() WHERE id=$1 AND tenant_id=$2 AND status IN ('pendente','aprovada') RETURNING id",
      [req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(400).json({ sucesso: false, mensagem: 'Compra não pode ser cancelada.' });
    res.json({ sucesso: true, mensagem: 'Compra cancelada.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar compra.' }); }
});

module.exports = router;
