const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/connection');
const { authMiddleware, checkPermissao } = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);
router.use(checkPermissao(['master','admin','gerente']));

router.get('/', async (req, res) => {
  const { busca, status, funcao } = req.query;
  try {
    let sql = 'SELECT id,nome,cpf,cargo,funcao,turno,salario,telefone,email,foto_url,status,data_admissao,criado_em FROM funcionarios WHERE tenant_id=$1';
    const params = [req.usuario.tenant_id];
    if (status) { params.push(status); sql += ` AND status=$${params.length}`; }
    if (funcao) { params.push(funcao); sql += ` AND funcao=$${params.length}`; }
    if (busca) { params.push(`%${busca}%`); sql += ` AND (nome ILIKE $${params.length} OR cpf ILIKE $${params.length})`; }
    sql += ' ORDER BY nome';
    const { rows } = await query(sql, params);
    const { rows: stats } = await query(
      `SELECT COUNT(*) FILTER (WHERE status='ativo') AS ativos,
              COUNT(*) FILTER (WHERE status='ferias') AS em_ferias,
              COUNT(*) FILTER (WHERE status='afastado') AS afastados,
              COALESCE(SUM(salario) FILTER (WHERE status='ativo'),0) AS folha_mensal
       FROM funcionarios WHERE tenant_id=$1`,
      [req.usuario.tenant_id]
    );
    res.json({ sucesso: true, dados: rows, total: rows.length, estatisticas: stats[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao listar funcionários.' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM funcionarios WHERE id=$1 AND tenant_id=$2', [req.params.id, req.usuario.tenant_id]);
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar funcionário.' }); }
});

router.post('/', [body('nome').notEmpty().withMessage('Nome é obrigatório')], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) return res.status(400).json({ sucesso: false, erros: erros.array() });
  const { nome, cpf, cargo, funcao, turno, salario, telefone, email, foto_url, cep, logradouro, numero, complemento, bairro, cidade, estado, status, data_admissao, observacoes } = req.body;
  try {
    const { rows } = await query(
      `INSERT INTO funcionarios (tenant_id,nome,cpf,cargo,funcao,turno,salario,telefone,email,foto_url,cep,logradouro,numero,complemento,bairro,cidade,estado,status,data_admissao,observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [req.usuario.tenant_id,nome,cpf,cargo,funcao||'operador',turno||'integral',salario||0,telefone,email,foto_url,cep,logradouro,numero,complemento,bairro,cidade,estado,status||'ativo',data_admissao||null,observacoes]
    );
    res.status(201).json({ sucesso: true, dados: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ sucesso: false, mensagem: 'Erro ao criar funcionário.' }); }
});

router.put('/:id', async (req, res) => {
  const { nome, cpf, cargo, funcao, turno, salario, telefone, email, foto_url, cep, logradouro, numero, complemento, bairro, cidade, estado, status, data_admissao, observacoes } = req.body;
  try {
    const { rows } = await query(
      `UPDATE funcionarios SET
        nome=COALESCE($1,nome), cpf=COALESCE($2,cpf), cargo=COALESCE($3,cargo),
        funcao=COALESCE($4,funcao), turno=COALESCE($5,turno), salario=COALESCE($6,salario),
        telefone=COALESCE($7,telefone), email=COALESCE($8,email), foto_url=COALESCE($9,foto_url),
        cep=COALESCE($10,cep), logradouro=COALESCE($11,logradouro), numero=COALESCE($12,numero),
        complemento=COALESCE($13,complemento), bairro=COALESCE($14,bairro), cidade=COALESCE($15,cidade),
        estado=COALESCE($16,estado), status=COALESCE($17,status), data_admissao=COALESCE($18,data_admissao),
        observacoes=COALESCE($19,observacoes), atualizado_em=NOW()
       WHERE id=$20 AND tenant_id=$21 RETURNING *`,
      [nome,cpf,cargo,funcao,turno,salario,telefone,email,foto_url,cep,logradouro,numero,complemento,bairro,cidade,estado,status,data_admissao,observacoes,req.params.id,req.usuario.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ sucesso: false, mensagem: 'Funcionário não encontrado.' });
    res.json({ sucesso: true, dados: rows[0] });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao atualizar funcionário.' }); }
});

router.delete('/:id', checkPermissao(['master','admin']), async (req, res) => {
  try {
    await query("UPDATE funcionarios SET status='inativo', atualizado_em=NOW() WHERE id=$1 AND tenant_id=$2", [req.params.id, req.usuario.tenant_id]);
    res.json({ sucesso: true, mensagem: 'Funcionário desativado.' });
  } catch { res.status(500).json({ sucesso: false, mensagem: 'Erro ao remover funcionário.' }); }
});

module.exports = router;
