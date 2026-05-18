const express = require('express');
const router = express.Router();
const { query } = require('../db/connection');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /api/automacoes — listar regras do tenant
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;

    const resultado = await query(
      `SELECT
         id, nome, ativa, gatilho, condicoes, acoes,
         execucoes, ultima_execucao, criado_em, atualizado_em
       FROM regras_automacao
       WHERE tenant_id = $1
       ORDER BY criado_em DESC`,
      [tenantId]
    );

    return res.json({ sucesso: true, dados: resultado.rows });
  } catch (err) {
    console.error('AUTOMACOES GET /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar regras de automação.' });
  }
});

// POST /api/automacoes — criar regra
router.post('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const {
      nome,
      gatilho,
      ativa = true,
      condicoes = [],
      acoes = [],
    } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "nome" é obrigatório.' });
    }
    if (!gatilho || !gatilho.trim()) {
      return res.status(400).json({ sucesso: false, mensagem: 'O campo "gatilho" é obrigatório.' });
    }

    const resultado = await query(
      `INSERT INTO regras_automacao
         (tenant_id, nome, gatilho, ativa, condicoes, acoes)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING *`,
      [
        tenantId,
        nome.trim(),
        gatilho.trim(),
        ativa,
        JSON.stringify(condicoes),
        JSON.stringify(acoes),
      ]
    );

    return res.status(201).json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('AUTOMACOES POST /:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar regra de automação.' });
  }
});

// PUT /api/automacoes/:id — atualizar regra
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;

    const existe = await query(
      'SELECT id FROM regras_automacao WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    if (existe.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Regra de automação não encontrada.' });
    }

    const { nome, gatilho, ativa, condicoes, acoes } = req.body;

    const campos = [];
    const params = [];

    if (nome !== undefined)      { params.push(nome.trim());                campos.push(`nome = $${params.length}`); }
    if (gatilho !== undefined)   { params.push(gatilho.trim());             campos.push(`gatilho = $${params.length}`); }
    if (ativa !== undefined)     { params.push(ativa);                      campos.push(`ativa = $${params.length}`); }
    if (condicoes !== undefined) { params.push(JSON.stringify(condicoes));  campos.push(`condicoes = $${params.length}::jsonb`); }
    if (acoes !== undefined)     { params.push(JSON.stringify(acoes));      campos.push(`acoes = $${params.length}::jsonb`); }

    if (campos.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Nenhum campo para atualizar.' });
    }

    params.push(id);
    const resultado = await query(
      `UPDATE regras_automacao SET ${campos.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    return res.json({ sucesso: true, dados: resultado.rows[0] });
  } catch (err) {
    console.error('AUTOMACOES PUT /:id:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar regra de automação.' });
  }
});

// DELETE /api/automacoes/:id — remover regra
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;

    const resultado = await query(
      'DELETE FROM regras_automacao WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Regra de automação não encontrada.' });
    }

    return res.json({ sucesso: true, mensagem: 'Regra removida com sucesso.' });
  } catch (err) {
    console.error('AUTOMACOES DELETE /:id:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover regra de automação.' });
  }
});

// PUT /api/automacoes/:id/toggle — ativar/desativar regra
router.put('/:id/toggle', async (req, res) => {
  try {
    const tenantId = req.usuario.tenant_id;
    const { id } = req.params;

    const resultado = await query(
      `UPDATE regras_automacao
       SET ativa = NOT ativa
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, nome, ativa`,
      [id, tenantId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Regra de automação não encontrada.' });
    }

    const regra = resultado.rows[0];
    return res.json({
      sucesso: true,
      dados: regra,
      mensagem: `Regra "${regra.nome}" ${regra.ativa ? 'ativada' : 'desativada'} com sucesso.`,
    });
  } catch (err) {
    console.error('AUTOMACOES PUT /:id/toggle:', err);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao alternar estado da regra.' });
  }
});

module.exports = router;
