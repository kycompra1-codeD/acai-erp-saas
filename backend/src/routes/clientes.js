const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { busca, status } = req.query;
  try {
    let sql = 'SELECT * FROM clientes WHERE tenant_id = $1';
    const params = [req.usuario.tenant_id];
    if (status) { params.push(status); sql += ` AND status = $${params.length}`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (nome ILIKE $${params.length} OR email ILIKE $${params.length} OR telefone ILIKE $${params.length} OR documento ILIKE $${params.length})`; }
    sql += ' ORDER BY nome';
    const { rows } = await query(sql, params);
    res.json({ sucesso: true, dados: rows, total: rows.length });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar clientes.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM clientes WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
    const { rows: pedidos } = await query(
      `SELECT id, numero, total, status, tipo, criado_em FROM pedidos
       WHERE cliente_id=$1 ORDER BY criado_em DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ sucesso: true, dados: { ...rows[0], pedidos } });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar cliente.' }); }
});

router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });
  const { nome, documento, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO clientes (tenant_id, nome, documento, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [req.usuario.tenant_id, nome, documento, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar cliente.' }); }
});

router.put('/:id', async (req, res) => {
  const { nome, documento, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado, status, pontos, desconto_fidelidade } = req.body;
  try {
    const { rows } = await query(
      `UPDATE clientes SET
        nome=COALESCE($1,nome), documento=COALESCE($2,documento), email=COALESCE($3,email),
        telefone=COALESCE($4,telefone), cep=COALESCE($5,cep), logradouro=COALESCE($6,logradouro),
        numero=COALESCE($7,numero), complemento=COALESCE($8,complemento), bairro=COALESCE($9,bairro),
        cidade=COALESCE($10,cidade), estado=COALESCE($11,estado), status=COALESCE($12,status),
        pontos=COALESCE($13,pontos), desconto_fidelidade=COALESCE($14,desconto_fidelidade),
        atualizado_em=NOW()
       WHERE id=$15 AND tenant_id=$16 RETURNING *`,
      [nome, documento, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado, status, pontos, desconto_fidelidade, req.params.id, req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar cliente.' }); }
});

router.delete('/:id', checkPermissao(['master','admin','gerente']), async (req, res) => {
  try {
    await query('UPDATE clientes SET status=$1, atualizado_em=NOW() WHERE id=$2 AND tenant_id=$3', ['inativo', req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Cliente desativado.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover cliente.' }); }
});

module.exports = router;
