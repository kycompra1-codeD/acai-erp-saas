const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/estoque — listar insumos com status de estoque
router.get('/', async (req, res) => {
  const { busca, status_estoque, categoria } = req.query;
  try {
    let sql = `
      SELECT i.*,
        CASE
          WHEN i.quantidade_atual <= i.quantidade_minima THEN 'critico'
          WHEN i.quantidade_atual <= i.quantidade_minima * 1.5 THEN 'alerta'
          ELSE 'ok'
        END AS status_estoque
      FROM insumos i
      WHERE i.tenant_id = $1
    `;
    const params = [req.usuario.tenant_id];
    if (categoria) { params.push(categoria); sql += ` AND i.categoria = $${params.length}`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (i.nome ILIKE $${params.length} OR i.unidade ILIKE $${params.length})`; }
    if (status_estoque === 'critico') sql += ` AND i.quantidade_atual <= i.quantidade_minima`;
    if (status_estoque === 'alerta') sql += ` AND i.quantidade_atual <= i.quantidade_minima * 1.5 AND i.quantidade_atual > i.quantidade_minima`;
    sql += ' ORDER BY i.nome';

    const { rows } = await query(sql, params);

    const { rows: alertas } = await query(
      `SELECT COUNT(*) FILTER (WHERE quantidade_atual <= quantidade_minima) AS criticos,
              COUNT(*) FILTER (WHERE quantidade_atual <= quantidade_minima * 1.5 AND quantidade_atual > quantidade_minima) AS alertas
       FROM insumos WHERE tenant_id=$1`,
      [req.usuario.tenant_id]
    );

    res.json({ sucesso: true, dados: rows, total: rows.length, alertas: alertas[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar estoque.' }); }
});

// GET /api/estoque/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM insumos WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Insumo não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar insumo.' }); }
});

// POST /api/estoque
router.post('/', checkPermissao(['master','admin','gerente']), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('unidade').notEmpty().withMessage('Unidade é obrigatória'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { nome, unidade, categoria, quantidade_atual = 0, quantidade_minima = 0, custo_unitario = 0, fornecedor_id, observacoes } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO insumos (tenant_id, nome, unidade, categoria, quantidade_atual, quantidade_minima, custo_unitario, fornecedor_id, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.usuario.tenant_id, nome, unidade, categoria, quantidade_atual, quantidade_minima, custo_unitario, fornecedor_id || null, observacoes]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar insumo.' }); }
});

// PUT /api/estoque/:id
router.put('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  const { nome, unidade, categoria, quantidade_minima, custo_unitario, fornecedor_id, observacoes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE insumos SET
        nome=COALESCE($1,nome), unidade=COALESCE($2,unidade), categoria=COALESCE($3,categoria),
        quantidade_minima=COALESCE($4,quantidade_minima), custo_unitario=COALESCE($5,custo_unitario),
        fornecedor_id=COALESCE($6,fornecedor_id), observacoes=COALESCE($7,observacoes), atualizado_em=NOW()
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [nome, unidade, categoria, quantidade_minima, custo_unitario, fornecedor_id, observacoes, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Insumo não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar insumo.' }); }
});

// DELETE /api/estoque/:id
router.delete('/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    await query('DELETE FROM insumos WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Insumo removido.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover insumo.' }); }
});

// GET /api/estoque/:id/movimentacoes
router.get('/:id/movimentacoes', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  try {
    const { rows } = await query(
      `SELECT m.*, u.nome AS usuario_nome
       FROM movimentacoes_estoque m
       LEFT JOIN usuarios u ON u.id = m.usuario_id
       WHERE m.insumo_id=$1 AND m.tenant_id=$2
       ORDER BY m.criado_em DESC LIMIT $3 OFFSET $4`,
      [req.params.id, req.usuario.tenant_id, limit, offset]
    );
    res.json({ sucesso: true, dados: rows });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar movimentações.' }); }
});

// POST /api/estoque/:id/movimentacoes — entrada / saída / acerto
router.post('/:id/movimentacoes', [
  body('tipo').isIn(['entrada','saida','acerto']).withMessage('Tipo inválido'),
  body('quantidade').isFloat({ min: 0.001 }).withMessage('Quantidade inválida'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { tipo, quantidade, motivo, custo_unitario } = req.body;
  try {
    await withTransaction(async (client) => {
      const { rows: insumoRows } = await client.query(
        'SELECT * FROM insumos WHERE id=$1 AND tenant_id=$2 FOR UPDATE',
        [req.params.id, req.usuario.tenant_id]
      );
      if (!insumoRows.length) { res.status(404).json({ sucesso: false, mensagem: 'Insumo não encontrado.' }); return; }

      const insumo = insumoRows[0];
      let novaQtd;
      if (tipo === 'entrada') novaQtd = parseFloat(insumo.quantidade_atual) + parseFloat(quantidade);
      else if (tipo === 'saida') novaQtd = Math.max(0, parseFloat(insumo.quantidade_atual) - parseFloat(quantidade));
      else novaQtd = parseFloat(quantidade); // acerto

      await client.query(
        'UPDATE insumos SET quantidade_atual=$1, atualizado_em=NOW() WHERE id=$2',
        [novaQtd, req.params.id]
      );

      const { rows: movRows } = await client.query(
        `INSERT INTO movimentacoes_estoque (tenant_id, insumo_id, tipo, quantidade, quantidade_anterior, quantidade_posterior, motivo, usuario_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [req.usuario.tenant_id, req.params.id, tipo, quantidade, insumo.quantidade_atual, novaQtd, motivo, req.usuario.id]
      );

      res.status(201).json({ sucesso: true, dados: movRows[0], quantidade_atual: novaQtd });
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao registrar movimentação.' }); }
});

module.exports = router;
