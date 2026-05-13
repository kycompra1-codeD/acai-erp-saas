const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

// GET /api/financeiro
router.get('/', async (req, res) => {
  const { tipo, categoria, status, data_inicio, data_fim, limit = 100, offset = 0 } = req.query;
  try {
    let sql = `
      SELECT lf.*, p.numero AS pedido_numero
      FROM lancamentos_financeiros lf
      LEFT JOIN pedidos p ON p.id = lf.pedido_id
      WHERE lf.tenant_id = $1
    `;
    const params = [req.usuario.tenant_id];
    if (tipo) { params.push(tipo); sql += ` AND lf.tipo = $${params.length}`; }
    if (categoria) { params.push(categoria); sql += ` AND lf.categoria = $${params.length}`; }
    if (status) { params.push(status); sql += ` AND lf.status = $${params.length}`; }
    if (data_inicio) { params.push(data_inicio); sql += ` AND lf.data >= $${params.length}`; }
    if (data_fim) { params.push(data_fim); sql += ` AND lf.data <= $${params.length}`; }
    sql += ` ORDER BY lf.data DESC, lf.criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await query(sql, params);

    const { rows: totais } = await query(
      `SELECT
        COALESCE(SUM(valor) FILTER (WHERE tipo='receita' AND status='pago'), 0) AS total_receitas,
        COALESCE(SUM(valor) FILTER (WHERE tipo='despesa' AND status='pago'), 0) AS total_despesas,
        COALESCE(SUM(valor) FILTER (WHERE tipo='receita' AND status='pendente'), 0) AS receitas_pendentes,
        COALESCE(SUM(valor) FILTER (WHERE tipo='despesa' AND status='pendente'), 0) AS despesas_pendentes
       FROM lancamentos_financeiros WHERE tenant_id=$1`,
      [req.usuario.tenant_id]
    );

    const resumo = totais[0];
    resumo.saldo = parseFloat(resumo.total_receitas) - parseFloat(resumo.total_despesas);

    res.json({ sucesso: true, dados: rows, total: rows.length, resumo });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar lançamentos.' }); }
});

// GET /api/financeiro/dre — DRE por período
router.get('/dre', async (req, res) => {
  const { data_inicio, data_fim } = req.query;
  if (!data_inicio || !data_fim) return res.status(400).json({ sucesso: false, mensagem: 'data_inicio e data_fim são obrigatórios.' });

  try {
    const { rows } = await query(
      `SELECT
        categoria,
        tipo,
        COUNT(*) AS quantidade,
        SUM(valor) AS total
       FROM lancamentos_financeiros
       WHERE tenant_id=$1 AND status='pago'
         AND data BETWEEN $2 AND $3
       GROUP BY categoria, tipo
       ORDER BY tipo DESC, total DESC`,
      [req.usuario.tenant_id, data_inicio, data_fim]
    );

    const receitas = rows.filter(r => r.tipo === 'receita');
    const despesas = rows.filter(r => r.tipo === 'despesa');
    const totalReceitas = receitas.reduce((acc, r) => acc + parseFloat(r.total), 0);
    const totalDespesas = despesas.reduce((acc, r) => acc + parseFloat(r.total), 0);

    res.json({
      sucesso: true,
      dados: {
        receitas,
        despesas,
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        lucro_bruto: totalReceitas - totalDespesas,
        margem: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas * 100).toFixed(2) : 0,
      }
    });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar DRE.' }); }
});

// GET /api/financeiro/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM lancamentos_financeiros WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Lançamento não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar lançamento.' }); }
});

// POST /api/financeiro — criar lançamento manual
router.post('/', checkPermissao(['master','admin','gerente']), [
  body('tipo').isIn(['receita','despesa']).withMessage('Tipo inválido'),
  body('valor').isFloat({ min: 0.01 }).withMessage('Valor inválido'),
  body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  body('categoria').notEmpty().withMessage('Categoria é obrigatória'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });

  const { tipo, categoria, descricao, valor, status = 'pendente', data, metodo_pagamento } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO lancamentos_financeiros (tenant_id, tipo, categoria, descricao, valor, status, data, metodo_pagamento)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.usuario.tenant_id, tipo, categoria, descricao, valor, status, data || null, metodo_pagamento || null]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar lançamento.' }); }
});

// PUT /api/financeiro/:id
router.put('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  const { tipo, categoria, descricao, valor, status, data, metodo_pagamento } = req.body;
  try {
    const { rows } = await query(
      `UPDATE lancamentos_financeiros SET
        tipo=COALESCE($1,tipo), categoria=COALESCE($2,categoria), descricao=COALESCE($3,descricao),
        valor=COALESCE($4,valor), status=COALESCE($5,status),
        data=COALESCE($6,data), metodo_pagamento=COALESCE($7,metodo_pagamento),
        atualizado_em=NOW()
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [tipo, categoria, descricao, valor, status, data, metodo_pagamento, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Lançamento não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar lançamento.' }); }
});

// DELETE /api/financeiro/:id — só exclui lançamentos manuais (sem pedido_id)
router.delete('/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    const { rows } = await query(
      'DELETE FROM lancamentos_financeiros WHERE id=$1 AND tenant_id=$2 AND pedido_id IS NULL RETURNING id',
      [req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(400).json({ sucesso: false, mensagem: 'Lançamento não pode ser excluído (vinculado a pedido ou não encontrado).' });
    res.json({ sucesso: true, mensagem: 'Lançamento excluído.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao excluir lançamento.' }); }
});

module.exports = router;
