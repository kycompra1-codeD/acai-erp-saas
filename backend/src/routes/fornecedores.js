const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { busca, status, categoria } = req.query;
  try {
    let sql = 'SELECT * FROM fornecedores WHERE tenant_id = $1';
    const params = [req.usuario.tenant_id];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (categoria) { params.push(categoria); sql += ` AND categoria = $${params.length}`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (nome ILIKE $${params.length} OR cnpj ILIKE $${params.length} OR email ILIKE $${params.length})`; }
    sql += ' ORDER BY nome';
    const { rows } = await query(sql, params);
    res.json({ sucesso: true, dados: rows, total: rows.length });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar fornecedores.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM fornecedores WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar fornecedor.' }); }
});

router.post('/', checkPermissao(['master','admin','gerente']), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });
  const { nome, cnpj, contato, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, categoria, avaliacao = 3, prazo_pagamento, observacoes } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO fornecedores (tenant_id, nome, cnpj, contato, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, categoria, avaliacao, prazo_pagamento, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [req.usuario.tenant_id, nome, cnpj, contato, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, categoria, avaliacao, prazo_pagamento, observacoes]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar fornecedor.' }); }
});

router.put('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  const { nome, cnpj, contato, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, categoria, avaliacao, prazo_pagamento, observacoes, status } = req.body;
  try {
    const { rows } = await query(
      `UPDATE fornecedores SET
        nome=COALESCE($1,nome), cnpj=COALESCE($2,cnpj), contato=COALESCE($3,contato),
        telefone=COALESCE($4,telefone), email=COALESCE($5,email), cep=COALESCE($6,cep),
        logradouro=COALESCE($7,logradouro), numero=COALESCE($8,numero), complemento=COALESCE($9,complemento),
        bairro=COALESCE($10,bairro), cidade=COALESCE($11,cidade), estado=COALESCE($12,estado),
        categoria=COALESCE($13,categoria), avaliacao=COALESCE($14,avaliacao),
        prazo_pagamento=COALESCE($15,prazo_pagamento), observacoes=COALESCE($16,observacoes),
        status=COALESCE($17,status), atualizado_em=NOW()
       WHERE id=$18 AND tenant_id=$19 RETURNING *`,
      [nome, cnpj, contato, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, estado, categoria, avaliacao, prazo_pagamento, observacoes, status, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Fornecedor não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar fornecedor.' }); }
});

router.delete('/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    await query("UPDATE fornecedores SET status='inativo', atualizado_em=NOW() WHERE id=$1 AND tenant_id=$2", [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Fornecedor desativado.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover fornecedor.' }); }
});

module.exports = router;
