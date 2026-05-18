const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /api/crm — listar oportunidades do tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { etapa } = req.query;

    let sql = `
      SELECT
        o.id, o.titulo, o.valor, o.etapa, o.probabilidade,
        o.data_fechamento, o.notas, o.criado_em, o.atualizado_em,
        c.id   AS cliente_id,
        c.nome AS cliente_nome
      FROM oportunidades o
      LEFT JOIN clientes c ON c.id = o.cliente_id AND c.tenant_id = $1
      WHERE o.tenant_id = $1
    `;
    const params = [tenantId];

    if (etapa) {
      params.push(etapa);
      sql += ` AND o.etapa = $${params.length}`;
    }

    sql += ' ORDER BY o.criado_em DESC';

    const resultado = await query(sql, params);
    return res.json({ sucesso: true, dados: resultado.rows });
  } catch (err) {
    console.error('CRM GET /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar oportunidades.' });
  }
});

// GET /api/crm/resumo — funil: contagem + soma por etapa
router.get('/resumo', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;

    const resultado = await query(
      `SELECT
         etapa,
         COUNT(*)          AS total,
         COALESCE(SUM(valor), 0) AS valor_total
       FROM oportunidades
       WHERE tenant_id = $1
       GROUP BY etapa
       ORDER BY
         CASE etapa
           WHEN 'lead'            THEN 1
           WHEN 'contato'         THEN 2
           WHEN 'proposta'        THEN 3
           WHEN 'negociacao'      THEN 4
           WHEN 'fechado_ganho'   THEN 5
           WHEN 'fechado_perdido' THEN 6
         END`,
      [tenantId]
    );

    return res.json({ sucesso: true, dados: resultado.rows });
  } catch (err) {
    console.error('CRM GET /resumo:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao gerar resumo do funil.' });
  }
});

// POST /api/crm — criar oportunidade
router.post('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const {
      titulo,
      cliente_id = null,
      valor = 0,
      etapa = 'lead',
      probabilidade = 50,
      data_fechamento = null,
      notas = null,
    } = req.body;

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "titulo" é obrigatório.' });
    }

    const resultado = await query(
      `INSERT INTO oportunidades
         (tenant_id, cliente_id, titulo, valor, etapa, probabilidade, data_fechamento, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenantId, cliente_id, titulo.trim(), valor, etapa, probabilidade, data_fechamento, notas]
    );

    return res.status(201).json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('CRM POST /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar oportunidade.' });
  }
});

// PUT /api/crm/:id — atualizar oportunidade
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;

    const existe = await query(
      'SELECT id FROM oportunidades WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (existe.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Oportunidade não encontrada.' });
    }

    const {
      titulo,
      cliente_id,
      valor,
      etapa,
      probabilidade,
      data_fechamento,
      notas,
    } = req.body;

    const campos = [];
    const params = [];

    if (titulo !== undefined)          { params.push(titulo);          campos.push(`titulo = $${params.length}`); }
    if (cliente_id !== undefined)      { params.push(cliente_id);      campos.push(`cliente_id = $${params.length}`); }
    if (valor !== undefined)           { params.push(valor);           campos.push(`valor = $${params.length}`); }
    if (etapa !== undefined)           { params.push(etapa);           campos.push(`etapa = $${params.length}`); }
    if (probabilidade !== undefined)   { params.push(probabilidade);   campos.push(`probabilidade = $${params.length}`); }
    if (data_fechamento !== undefined) { params.push(data_fechamento); campos.push(`data_fechamento = $${params.length}`); }
    if (notas !== undefined)           { params.push(notas);           campos.push(`notas = $${params.length}`); }

    if (campos.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo para atualizar.' });
    }

    params.push(id);
    const resultado = await query(
      `UPDATE oportunidades SET ${campos.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    return res.json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('CRM PUT /:id:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar oportunidade.' });
  }
});

// DELETE /api/crm/:id — remover oportunidade
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;

    const resultado = await query(
      'DELETE FROM oportunidades WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Oportunidade não encontrada.' });
    }

    return res.json({ sucesso: true, mensagem: 'Oportunidade removida com sucesso.' });
  } catch (err) {
    console.error('CRM DELETE /:id:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover oportunidade.' });
  }
});

module.exports = router;
